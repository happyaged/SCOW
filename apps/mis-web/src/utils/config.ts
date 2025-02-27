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

import { AuditConfigSchema } from "@scow/config/build/audit";
import type { ClusterConfigSchema } from "@scow/config/build/cluster";
import type { ClusterTextsConfigSchema } from "@scow/config/build/clusterTexts";
import type { MisConfigSchema } from "@scow/config/build/mis";
import type { UiConfigSchema } from "@scow/config/build/ui";
import { UserLink } from "@scow/lib-web/build/layouts/base/types";
import getConfig from "next/config";

export interface ServerRuntimeConfig {
  AUTH_EXTERNAL_URL: string;
  AUTH_INTERNAL_URL: string;

  SERVER_URL: string;

  UI_CONFIG: UiConfigSchema | undefined;
  DEFAULT_PRIMARY_COLOR: string;

  CLUSTERS_CONFIG: {[clusterId: string]: ClusterConfigSchema};
  CLUSTER_TEXTS_CONFIG: ClusterTextsConfigSchema;

  SCOW_API_AUTH_TOKEN?: string;

  AUDIT_CONFIG: AuditConfigSchema | undefined;
}

export interface PublicRuntimeConfig {
  BASE_PATH: string;
  CLUSTERS: { [clusterId: string]: Cluster };
  PREDEFINED_CHARGING_TYPES: string[];
  CREATE_USER_CONFIG: {
    misConfig: MisConfigSchema["createUser"],
    authSupportsCreateUser: boolean | undefined,
  },
  ENABLE_CHANGE_PASSWORD: boolean | undefined;

  ACCOUNT_NAME_PATTERN: string | undefined;
  ACCOUNT_NAME_PATTERN_MESSAGE: string | undefined;

  PASSWORD_PATTERN: string | undefined;
  PASSWORD_PATTERN_MESSAGE: string | undefined;

  PORTAL_URL: string | undefined;

  PUBLIC_PATH: string;

  NAV_LINKS?: NavLink[];

  CUSTOM_AMOUNT_STRATEGIES?: CustomAmountStrategy[];

  USER_LINKS?: UserLink[];

  VERSION_TAG: string | undefined;

  AUDIT_DEPLOYED: boolean;

  CHARGE_TYPE_LIST: string[];
}

export const runtimeConfig: ServerRuntimeConfig = getConfig().serverRuntimeConfig;
export const publicConfig: PublicRuntimeConfig = getConfig().publicRuntimeConfig;

export type Cluster = { id: string; name: string; }
export type NavLink = {
  text: string;
  url?: string;
  openInNewPage?: boolean;
  iconPath?: string;
  allowedRoles?: string[];
  children?: (Omit<NavLink, "children" | "url"> & { url: string })[];
}

export type CustomAmountStrategy = {
  id: string;
  script: string;
  name?: string | undefined;
  comment?: string | undefined;
}


export const getClusterName = (clusterId: string) => {
  return publicConfig.CLUSTERS[clusterId]?.name || clusterId;
};
