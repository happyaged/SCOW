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

import { typeboxRoute, typeboxRouteSchema } from "@ddadaal/next-typed-api-routes-runtime";
import { asyncClientCall } from "@ddadaal/tsgrpc-client";
import { Status } from "@grpc/grpc-js/build/src/constants";
import { UserServiceClient } from "@scow/protos/build/server/user";
import { Type } from "@sinclair/typebox";
import { authenticate } from "src/auth/server";
import { OperationResult, OperationType } from "src/models/operationLog";
import { TenantRole } from "src/models/User";
import { callLog } from "src/server/operationLog";
import { getClient } from "src/utils/client";
import { DEFAULT_INIT_USER_ID, DEFAULT_TENANT_NAME } from "src/utils/constants";
import { queryIfInitialized } from "src/utils/init";
import { handlegRPCError, parseIp } from "src/utils/server";


export const UnsetTenantRoleSchema = typeboxRouteSchema({
  method: "PUT",

  body: Type.Object({
    userId: Type.String(),
    roleType: Type.Enum(TenantRole),
  }),

  responses: {
    // 如果用户已经不是这个角色，那么executed为false
    200: Type.Object({ executed: Type.Boolean() }),
    // 用户不存在
    404: Type.Null(),
  },
});

export default typeboxRoute(UnsetTenantRoleSchema, async (req, res) => {
  const { userId, roleType } = req.body;

  const logInfo = {
    operatorUserId: DEFAULT_INIT_USER_ID,
    operatorIp: parseIp(req) ?? "",
    operationTypeName: roleType === TenantRole.TENANT_ADMIN
      ? OperationType.unsetTenantAdmin
      : OperationType.unsetTenantFinance,
    operationTypePayload:{
      tenantName: DEFAULT_TENANT_NAME, userId,
    },
  };

  if (await queryIfInitialized()) {
    const auth = authenticate((u) =>
      u.tenantRoles.includes(TenantRole.TENANT_ADMIN) &&
    !(u.identityId === userId && roleType === TenantRole.TENANT_ADMIN));
    const info = await auth(req, res);
    if (info) {
      logInfo.operatorUserId = info.identityId;
      logInfo.operationTypePayload.tenantName = info.tenant;
    } else { return; }
  }

  const client = getClient(UserServiceClient);

  return await asyncClientCall(client, "unsetTenantRole", {
    userId,
    roleType,
  })
    .then(async () => {
      await callLog(logInfo, OperationResult.SUCCESS);
      return { 200: { executed: true } };
    })
    .catch(handlegRPCError({
      [Status.NOT_FOUND]: () => ({ 404: null }),
      [Status.FAILED_PRECONDITION]: () => ({ 200: { executed: false } }),
    },
    async () => await callLog(logInfo, OperationResult.FAIL),
    ));
});
