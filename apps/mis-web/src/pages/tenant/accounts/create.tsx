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

import { FormLayout } from "@scow/lib-web/build/layouts/FormLayout";
import { App, Button, Form, Input } from "antd";
import { NextPage } from "next";
import React, { useState } from "react";
import { api } from "src/apis";
import { requireAuth } from "src/auth/requireAuth";
import { PageTitle } from "src/components/PageTitle";
import { TenantRole } from "src/models/User";
import { publicConfig } from "src/utils/config";
import { getUserIdRule } from "src/utils/createUser";
import { Head } from "src/utils/head";

interface FormProps {
  ownerId: string;
  ownerName: string;
  accountName: string;
  comment?: string;
}

interface CreateAccountFormProps {
  tenantName: string;
}


const CreateAccountForm: React.FC<CreateAccountFormProps> = ({ tenantName }) => {

  const [form] = Form.useForm<FormProps>();

  const [loading, setLoading] = useState(false);

  const { message } = App.useApp();

  const submit = async () => {
    const { accountName, ownerId, ownerName, comment } = await form.validateFields();
    setLoading(true);
    message.open({ type: "loading", content: "操作所需时间较长，请耐心等待", duration: 0, key: "createAccount" });
    await api.createAccount({ body: { accountName, ownerId, ownerName, comment } })
      .httpError(404, () => { message.error(`租户 ${tenantName} 下不存在用户 ${ownerId}。`); })
      .httpError(409, () => { message.error("账户名已经被占用"); })
      .httpError(400, () => { message.error("用户ID和名字不匹配。"); })
      .then(() => {
        message.success("创建成功！");
      })
      .finally(() => {
        message.destroy("createAccount");
        setLoading(false);
      });
  };

  const userIdRule = getUserIdRule();

  return (
    <Form
      form={form}
      wrapperCol={{ span: 20 }}
      labelCol={{ span: 4 }}
      labelAlign="right"
      onFinish={submit}
    >
      <Form.Item
        name="accountName"
        label="账户名"
        rules={[
          { required: true },
          ...(publicConfig.ACCOUNT_NAME_PATTERN ? [{
            pattern: new RegExp(publicConfig.ACCOUNT_NAME_PATTERN),
            message: publicConfig.ACCOUNT_NAME_PATTERN_MESSAGE }] : []),
        ]}
      >
        <Input />
      </Form.Item>
      <Form.Item
        name="ownerId"
        label="拥有者用户ID"
        rules={[
          { required: true },
          ...userIdRule ? [userIdRule] : [],
        ]}

      >
        <Input />
      </Form.Item>
      <Form.Item
        name="ownerName"
        label="拥有者姓名"
        rules={[{ required: true }]}
      >
        <Input />
      </Form.Item>
      <Form.Item<FormProps> name="comment" label="备注">
        <Input.TextArea />
      </Form.Item>
      <Form.Item wrapperCol={{ span: 6, offset: 4 }}>
        <Button type="primary" htmlType="submit" loading={loading}>
          提交
        </Button>
      </Form.Item>
    </Form>
  );
};

export const CreateAccountPage: NextPage = requireAuth((i) => i.tenantRoles.includes(TenantRole.TENANT_ADMIN))(
  ({ userStore }) => {
    return (
      <div>
        <Head title="创建账户" />
        <PageTitle titleText="创建账户" />
        <FormLayout>
          <CreateAccountForm tenantName={userStore.user.tenant} />
        </FormLayout>
      </div>
    );
  });

export default CreateAccountPage;
