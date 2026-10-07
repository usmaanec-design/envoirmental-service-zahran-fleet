<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="2.0" 
                xmlns:html="http://www.w3.org/TR/REC-html40"
                xmlns:sitemap="http://www.sitemaps.org/schemas/sitemap/0.9"
                xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
  <xsl:output method="html" version="1.0" encoding="UTF-8" indent="yes"/>
  <xsl:template match="/">
    <html xmlns="http://www.w3.org/1999/xhtml" lang="en">
      <head>
        <title>XML Sitemap | Zahran Environmental Services</title>
        <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <style type="text/css">
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen-Sans, Ubuntu, Cantarell, "Helvetica Neue", sans-serif;
            color: #333;
            background-color: #fdf8f0;
            margin: 0;
            padding: 20px;
          }
          .container {
            max-width: 1000px;
            margin: 0 auto;
            background: #ffffff;
            border-radius: 12px;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
            overflow: hidden;
            border: 1px solid #fed7aa;
          }
          .header {
            background: linear-gradient(135deg, #ea580c 0%, #ca8a04 100%);
            color: white;
            padding: 30px;
          }
          .header h1 {
            margin: 0 0 10px 0;
            font-size: 26px;
            font-weight: 700;
          }
          .header p {
            margin: 0;
            opacity: 0.9;
            font-size: 15px;
            line-height: 1.5;
          }
          .stats-bar {
            background: #fff7ed;
            padding: 15px 30px;
            border-bottom: 1px solid #fed7aa;
            display: flex;
            justify-content: space-between;
            align-items: center;
            font-size: 14px;
            color: #9a3412;
            font-weight: 600;
          }
          table {
            width: 100%;
            border-collapse: collapse;
          }
          th {
            background: #f8fafc;
            color: #475569;
            text-align: left;
            padding: 14px 20px;
            font-size: 13px;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            border-bottom: 2px solid #e2e8f0;
          }
          td {
            padding: 14px 20px;
            border-bottom: 1px solid #f1f5f9;
            font-size: 14px;
          }
          tr:hover td {
            background: #fffaf0;
          }
          a {
            color: #ea580c;
            text-decoration: none;
            font-weight: 500;
            word-break: break-all;
          }
          a:hover {
            text-decoration: underline;
          }
          .badge {
            display: inline-block;
            padding: 4px 10px;
            border-radius: 9999px;
            font-size: 12px;
            font-weight: 700;
          }
          .badge-high {
            background: #dcfce7;
            color: #15803d;
          }
          .badge-med {
            background: #ffedd5;
            color: #c2410c;
          }
          .badge-norm {
            background: #f1f5f9;
            color: #475569;
          }
          .footer {
            padding: 20px 30px;
            background: #fff7ed;
            text-align: center;
            font-size: 13px;
            color: #78716c;
            border-top: 1px solid #fed7aa;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Zahran Environmental Services &amp; Fleet Management</h1>
            <p>Official XML Sitemap for Google Search Console and Search Engine Indexing. Generated for maximum search visibility.</p>
          </div>
          <div class="stats-bar">
            <span>Total URLs: <xsl:value-of select="count(sitemap:urlset/sitemap:url)"/></span>
            <span>Index Status: Ready for Search Console</span>
          </div>
          <table>
            <thead>
              <tr>
                <th style="width: 50%;">Page URL</th>
                <th style="width: 15%;">Priority</th>
                <th style="width: 15%;">Change Frequency</th>
                <th style="width: 20%;">Last Modified</th>
              </tr>
            </thead>
            <tbody>
              <xsl:for-each select="sitemap:urlset/sitemap:url">
                <tr>
                  <td>
                    <a href="{sitemap:loc}"><xsl:value-of select="sitemap:loc"/></a>
                  </td>
                  <td>
                    <xsl:choose>
                      <xsl:when test="sitemap:priority &gt;= 0.9">
                        <span class="badge badge-high"><xsl:value-of select="sitemap:priority"/></span>
                      </xsl:when>
                      <xsl:when test="sitemap:priority &gt;= 0.7">
                        <span class="badge badge-med"><xsl:value-of select="sitemap:priority"/></span>
                      </xsl:when>
                      <xsl:otherwise>
                        <span class="badge badge-norm"><xsl:value-of select="sitemap:priority"/></span>
                      </xsl:otherwise>
                    </xsl:choose>
                  </td>
                  <td>
                    <xsl:value-of select="sitemap:changefreq"/>
                  </td>
                  <td>
                    <xsl:value-of select="sitemap:lastmod"/>
                  </td>
                </tr>
              </xsl:for-each>
            </tbody>
          </table>
          <div class="footer">
            &#169; Zahran Environmental Services &amp; Operations. All rights reserved.
          </div>
        </div>
      </body>
    </html>
  </xsl:template>
</xsl:stylesheet>
