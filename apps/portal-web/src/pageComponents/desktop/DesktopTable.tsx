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

import { PlusOutlined } from "@ant-design/icons";
import { queryToString } from "@scow/lib-web/build/utils/querystring";
import { Button, Form, Select, Table } from "antd";
import { ColumnsType } from "antd/es/table";
import dayjs from "dayjs";
import { useRouter } from "next/router";
import React, { useCallback } from "react";
import { useAsync } from "react-async";
import { useStore } from "simstate";
import { api } from "src/apis";
import { SingleClusterSelector } from "src/components/ClusterSelector";
import { FilterFormContainer } from "src/components/FilterFormContainer";
import { ModalButton } from "src/components/ModalLink";
import { DesktopTableActions } from "src/pageComponents/desktop/DesktopTableActions";
import { NewDesktopTableModal } from "src/pageComponents/desktop/NewDesktopTableModal";
import { DefaultClusterStore } from "src/stores/DefaultClusterStore";
import { LoginNodeStore } from "src/stores/LoginNodeStore";
import { Cluster, publicConfig } from "src/utils/config";

const NewDesktopTableModalButton = ModalButton(NewDesktopTableModal, { type: "primary", icon: <PlusOutlined /> });

interface Props {
  loginDesktopEnabledClusters: Cluster[]
}

export type DesktopItem = {
  desktopId: number,
  desktopName: string,
  wm: string,
  createTime: string,
  addr: string,
}

export const DesktopTable: React.FC<Props> = ({ loginDesktopEnabledClusters }) => {

  const router = useRouter();

  const { defaultCluster } = useStore(DefaultClusterStore);
  const loginNodes = useStore(LoginNodeStore);

  const clusterQuery = queryToString(router.query.cluster);
  const loginQuery = queryToString(router.query.loginNode);
  // 如果默认集群没开启登录节点桌面功能，则取开启此功能的某一集群为默认集群。
  const enabledDefaultCluster = loginDesktopEnabledClusters.find((x) => x.id === defaultCluster.id)
    ? defaultCluster
    : loginDesktopEnabledClusters[0];
  const cluster = publicConfig.CLUSTERS.find((x) => x.id === clusterQuery) ?? enabledDefaultCluster;

  const loginNode = loginNodes[cluster.id].find((x) => x.name === loginQuery) ?? undefined;


  const { data, isLoading, reload } = useAsync({
    promiseFn: useCallback(async () => {
      // List all desktop
      const { userDesktops } = await api.listDesktops({
        query: { cluster: cluster.id, loginNode: loginNode?.address },
      });
      return userDesktops.map(
        (userDesktop) => userDesktop.desktops.map(
          (x) => ({
            desktopId: x.displayId,
            desktopName: x.desktopName,
            createTime: x.createTime,
            addr: userDesktop.host,
            wm: x.wm,
          }),
        ),
      ).flat();
    }, [cluster, loginNode]),
  });

  const { data: availableWms, isLoading: isWmLoading } = useAsync({
    promiseFn: useCallback(async () => api.listAvailableWms({ query: { cluster: cluster.id } }), [cluster.id]),
  });

  const columns: ColumnsType<DesktopItem> = [
    {
      title: "桌面ID",
      dataIndex: "desktopId",
      key: "desktopId",
      width: "10%",
    },
    {
      title: "桌面名称",
      dataIndex: "desktopName",
      key: "desktopName",
    },
    {
      title: "桌面类型",
      dataIndex: "wm",
      key: "wm",
      width: "20%",
      render: (wm) => {
        return availableWms?.wms.find((x) => x.wm === wm)?.name || wm;
      },
    },
    {
      title: "地址",
      dataIndex: "addr",
      key: "addr",
      width: "20%",
      render: (addr: string) => {
        return loginNodes[cluster.id].find((x) => x.address === addr)?.name || addr;
      },
    },
    {
      title: "创建时间",
      dataIndex: "createTime",
      key: "createTime",
      width: "15%",
      render: (createTime) => {
        return createTime ? dayjs(createTime).format("YYYY-MM-DD[T]HH:mm:ss") : "";
      },
    },
    {
      title: "操作",
      key: "action",
      width: "15%",
      render: (_, record) => (
        <DesktopTableActions cluster={cluster} reload={reload} record={record} />
      ),
    },
  ];

  return (
    <div>
      <FilterFormContainer>
        <Form layout="inline">
          <Form.Item label="集群">
            <SingleClusterSelector
              value={cluster}
              onChange={(x) => {
                router.push({ query: { cluster: x.id } });
              }}
              clusterIds={loginDesktopEnabledClusters.map((x) => x.id)}
            />
          </Form.Item>
          <Form.Item label="登录节点">
            <Select
              allowClear
              style={{ minWidth: 100 }}
              value={loginNode?.name}
              onChange={(x) => {
                const nextLoginQuery = x
                  ? loginNodes[cluster.id].find((loginNode) => loginNode.address === x)?.name
                  : undefined;
                router.push({
                  query: nextLoginQuery
                    ? {
                      cluster: cluster.id,
                      loginNode: nextLoginQuery,
                    }
                    : { cluster: cluster.id },
                });
              }}
              options={loginNodes[cluster.id].map((loginNode) => ({
                label: loginNode.name, value: loginNode.address,
              }))}
            >
            </Select>
          </Form.Item>
          <Form.Item>
            <Button onClick={reload} loading={isLoading}>
              刷新
            </Button>
          </Form.Item>
          <Form.Item>
            <NewDesktopTableModalButton
              reload={reload}
              cluster={cluster}
              loginNodes={loginNodes[cluster.id]}
              availableWms={availableWms?.wms ?? []}
            >
              新建桌面
            </NewDesktopTableModalButton>
          </Form.Item>
        </Form>
      </FilterFormContainer>
      <Table
        dataSource={data}
        columns={columns}
        rowKey={(record) => `${record.addr}:${record.desktopId}`}
        loading={isLoading || isWmLoading}
        pagination={false}
      />
    </div>
  );
};

