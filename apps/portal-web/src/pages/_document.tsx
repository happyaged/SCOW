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

import { createCache, extractStyle, StyleProvider } from "@ant-design/cssinjs";
import Document from "next/document";
import { ServerStyleSheet } from "styled-components";


export default class MyDocument extends Document {
  static async getInitialProps(ctx) {
    const sheet = new ServerStyleSheet();
    const originalRenderPage = ctx.renderPage;

    const antdCache = createCache();

    try {
      ctx.renderPage = () =>
        originalRenderPage({
          enhanceApp: (App) => (props) =>
            sheet.collectStyles(
              <StyleProvider cache={antdCache}>
                <App {...props} />
              </StyleProvider>,
            ),
        });

      const initialProps = await Document.getInitialProps(ctx);
      // Generate the css string for the styles coming from jss
      const antdCss = extractStyle(antdCache);
      return {
        ...initialProps,
        styles: [
          initialProps.styles,
          sheet.getStyleElement(),
          <style key="antd" dangerouslySetInnerHTML={{ __html: antdCss }} />,
        ],
      };
    } finally {
      sheet.seal();
    }
  }
}
