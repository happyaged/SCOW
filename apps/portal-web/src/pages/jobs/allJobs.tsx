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

import { NextPage } from "next";
import { requireAuth } from "src/auth/requireAuth";
import { PageTitle } from "src/components/PageTitle";
import { AllJobQueryTable } from "src/pageComponents/job/AllJobsTable";
import { Head } from "src/utils/head";

export const AllJobsPage: NextPage = requireAuth(() => true)(
  ({ userStore }) => {
    return (
      <div>
        <Head title="历史作业" />
        <PageTitle titleText={"本用户所有历史作业"} />
        <AllJobQueryTable
          userId={userStore.user.identityId}
        />
      </div>

    );

  });

export default AllJobsPage;
