/**
 * Copyright (c) 2022 Peking University and Peking University Institute for Computing and Digital Economy
 * SCOW is licensed under Mulan PSL v2.
 * You can use this software according to the terms and conditions of the Mulan PSL v2.
 * You may obtain a copy of Mulan PSL v2 at:
 *          http://license.coscl.org.cn/MulanPSL2
 * THIS SOFTWARE IS PROVIDED ON AN "AS IS" BASIS, WITHOUT WARRANTIES OF ANY KIND,
 * EITHER EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO NON-INFRINGEMENT,
 * MERCHANTABILITY OR FIT FOR A PARTICULAR PURPOSE.
 * See the Mulan PSL v2 for more details.
 */

import { asyncClientCall } from "@ddadaal/tsgrpc-client";
import { ServiceError } from "@ddadaal/tsgrpc-common";
import { plugin } from "@ddadaal/tsgrpc-server";
import { Status } from "@grpc/grpc-js/build/src/constants";
import { jobInfoToPortalJobInfo, jobInfoToRunningjob } from "@scow/lib-scheduler-adapter";
import { createDirectoriesRecursively } from "@scow/lib-ssh";
import { JobServiceServer, JobServiceService } from "@scow/protos/build/portal/job";
import { parseErrorDetails } from "@scow/rich-error-model";
import { getClusterOps } from "src/clusterops";
import { JobTemplate } from "src/clusterops/api/job";
import { getAdapterClient } from "src/utils/clusters";
import { clusterNotFound } from "src/utils/errors";
import { getClusterLoginNode, sshConnect } from "src/utils/ssh";

export const jobServiceServer = plugin((server) => {

  server.addService<JobServiceServer>(JobServiceService, {

    cancelJob: async ({ request }) => {

      const { cluster, jobId, userId } = request;

      const client = getAdapterClient(cluster);
      if (!client) { throw clusterNotFound(cluster); }

      await asyncClientCall(client.job, "cancelJob", {
        userId, jobId,
      });

      return [{}];

    },

    listAccounts: async ({ request }) => {
      const { cluster, userId } = request;

      const client = getAdapterClient(cluster);
      if (!client) { throw clusterNotFound(cluster); }

      const reply = await asyncClientCall(client.account, "listAccounts", {
        userId,
      });

      return [{ accounts: reply.accounts }];
    },

    getJobTemplate: async ({ request, logger }) => {
      const { cluster, templateId, userId } = request;

      const clusterops = getClusterOps(cluster);

      if (!clusterops) { throw clusterNotFound(cluster); }

      const reply = await clusterops.job.getJobTemplate({
        id: templateId, userId,
      }, logger);

      return [{ template: reply.template }];

    },

    listJobTemplates: async ({ request, logger }) => {

      const { cluster, userId } = request;

      const clusterops = getClusterOps(cluster);

      if (!clusterops) { throw clusterNotFound(cluster); }

      const reply = await clusterops.job.listJobTemplates({
        userId,
      }, logger);

      return [{ results: reply.results.map((x) => ({ ...x, submitTime: x.submitTime?.toISOString() })) }];

    },

    deleteJobTemplate: async ({ request, logger }) => {
      const { cluster, templateId, userId } = request;
      const clusterops = getClusterOps(cluster);

      if (!clusterops) { throw clusterNotFound(cluster); }

      await clusterops.job.deleteJobTemplate({
        id: templateId, userId,
      }, logger);

      return [{}];
    },

    renameJobTemplate: async ({ request, logger }) => {
      const { cluster, templateId, userId, jobName } = request;
      const clusterops = getClusterOps(cluster);

      if (!clusterops) { throw clusterNotFound(cluster); }

      await clusterops.job.renameJobTemplate({
        id: templateId, userId, jobName,
      }, logger);

      return [{}];
    },

    listRunningJobs: async ({ request }) => {

      const { cluster, userId } = request;

      const client = getAdapterClient(cluster);
      if (!client) { throw clusterNotFound(cluster); }

      const reply = await asyncClientCall(client.job, "getJobs", {
        fields: [
          "job_id", "partition", "name", "user", "state", "elapsed_seconds",
          "nodes_alloc", "node_list", "reason", "account", "cpus_alloc", "gpus_alloc",
          "qos", "submit_time", "time_limit_minutes", "working_directory",
        ],
        filter: { users: [userId], accounts: [], states: ["PENDING", "RUNNING"]},
      });

      return [{ results: reply.jobs.map(jobInfoToRunningjob) }];
    },

    listAllJobs: async ({ request }) => {
      const { cluster, userId, endTime, startTime } = request;

      const client = getAdapterClient(cluster);
      if (!client) { throw clusterNotFound(cluster); }

      const reply = await asyncClientCall(client.job, "getJobs", {
        fields: [
          "job_id", "name", "account", "partition", "qos", "state", "working_directory",
          "reason", "elapsed_seconds", "time_limit_minutes", "submit_time",
          "start_time", "end_time",
        ],
        filter: {
          users: [userId], accounts: [], states: [],
          submitTime: { startTime, endTime },
        },
      });

      return [{ results: reply.jobs.map(jobInfoToPortalJobInfo) }];

    },

    submitJob: async ({ request, logger }) => {
      const { cluster, command, jobName, coreCount, gpuCount, maxTime, saveAsTemplate, userId,
        nodeCount, partition, qos, account, comment, workingDirectory, output, errorOutput, memory } = request;


      const client = getAdapterClient(cluster);
      if (!client) { throw clusterNotFound(cluster); }

      // make sure working directory exists
      const host = getClusterLoginNode(cluster);
      if (!host) { throw clusterNotFound(cluster); }
      await sshConnect(host, userId, logger, async (ssh) => {
        const sftp = await ssh.requestSFTP();
        await createDirectoriesRecursively(sftp, workingDirectory);
      });

      const reply = await asyncClientCall(client.job, "submitJob", {
        userId, jobName, account, partition: partition!, qos, nodeCount, gpuCount: gpuCount || 0,
        memoryMb: Number(memory?.split("M")[0]), coreCount, timeLimitMinutes: maxTime,
        script: command, workingDirectory, stdout: output, stderr: errorOutput, extraOptions: [],
      }).catch((e) => {
        const ex = e as ServiceError;
        const errors = parseErrorDetails(ex.metadata);
        if (errors[0] && errors[0].$type === "google.rpc.ErrorInfo" && errors[0].reason === "SBATCH_FAILED") {
          throw <ServiceError> {
            code: Status.INTERNAL,
            message: "sbatch failed",
            details: e.details,
          };
        } else {
          throw e;
        }
      });

      if (saveAsTemplate) {
        const jobInfo: JobTemplate = {
          jobName,
          coreCount,
          maxTime,
          nodeCount,
          gpuCount,
          partition,
          qos,
          account,
          command,
          comment,
          workingDirectory,
          output,
          errorOutput,
          memory,
        };

        const clusterOps = getClusterOps(cluster);
        if (!clusterOps) { throw clusterNotFound(cluster); }

        logger.info("jobInfo: %o", jobInfo);
        await clusterOps.job.saveJobTemplate({
          userId, jobId: reply.jobId, jobInfo,
        }, logger);
      }

      return [{ jobId: reply.jobId }];
    },

  });

});
