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
import type { PortalConfigSchema } from "@scow/config/build/portal";
import type { UiConfigSchema } from "@scow/config/build/ui";
import { UserLink } from "@scow/lib-web/build/layouts/base/types";
import getConfig from "next/config";

export interface ServerRuntimeConfig {

  AUTH_EXTERNAL_URL: string;

  AUTH_INTERNAL_URL: string;

  CLUSTERS_CONFIG: {[cluster: string]: ClusterConfigSchema};

  UI_CONFIG?: UiConfigSchema;

  PORTAL_CONFIG: PortalConfigSchema;

  DEFAULT_PRIMARY_COLOR: string;

  MOCK_USER_ID: string | undefined;

  LOGIN_NODES: Record<string, string>;

  SERVER_URL: string;

  DEFAULT_HOME_TEXT: string;
  HOME_TEXTS: {[hostname: string]: string };

  DEFAULT_HOME_TITLE: string;
  HOME_TITLES: {[hostname: string]: string };

  SUBMIT_JOB_PROMPT_TEXT?: string;

  SUBMIT_JOB_WORKING_DIR: string;

  SCOW_API_AUTH_TOKEN?: string;

  AUDIT_CONFIG: AuditConfigSchema | undefined;
}

export interface PublicRuntimeConfig {
  ENABLE_CHANGE_PASSWORD: boolean | undefined;

  ENABLE_SHELL: boolean;

  ENABLE_LOGIN_DESKTOP: boolean;

  ENABLE_JOB_MANAGEMENT: boolean;

  ENABLE_APPS: boolean;

  MIS_URL: string | undefined;

  CLUSTERS: Cluster[];

  NOVNC_CLIENT_URL: string;

  PASSWORD_PATTERN: string | undefined;
  PASSWORD_PATTERN_MESSAGE: string | undefined;

  BASE_PATH: string;
  // 上传（请求）文件的大小限制
  CLIENT_MAX_BODY_SIZE: string;

  PUBLIC_PATH: string;

  NAV_LINKS?: NavLink[];

  USER_LINKS?: UserLink[];

  VERSION_TAG: string | undefined;

}

export const runtimeConfig: ServerRuntimeConfig = getConfig().serverRuntimeConfig;
export const publicConfig: PublicRuntimeConfig = getConfig().publicRuntimeConfig;

export type Cluster = { id: string; name: string; }
export type NavLink = {
  text: string;
  url?: string;
  openInNewPage?: boolean;
  iconPath?: string;
  children?: (Omit<NavLink, "children" | "url"> & { url: string })[];
}

export const getLoginDesktopEnabled = (cluster: string): boolean => {

  const clusterLoginDesktopEnabled = runtimeConfig.CLUSTERS_CONFIG[cluster]?.loginDesktop?.enabled;

  const commonLoginDesktopEnabled = runtimeConfig.PORTAL_CONFIG.loginDesktop.enabled;

  return clusterLoginDesktopEnabled === undefined ? commonLoginDesktopEnabled : clusterLoginDesktopEnabled;
};

export type LoginNode = { name: string, address: string }
