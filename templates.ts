export const indexTemplate = `<!DOCTYPE html>
<html>

<head>
    <meta charset="UTF-8" />
    <title>
        <%= urlPathname %>
    </title>
</head>

<body>
    <ul>
        <% for (const entry of entries) { %>
            <li>
                <a href="<%= path.join(urlPathname, entry.name) %>">
                    <%= entry.name %>
                </a>
            </li>
            <% } %>
    </ul>
</body>

</html>
`;

export const liveReloadBlockTemplate = `
++++
<script>
window.LiveReloadOptions = { host: "<%= serverHost %>", port: <%= serverPort %> };
</script>
<script src="https://cdn.jsdelivr.net/npm/livereload.js/dist/livereload.js"></script>
++++
`;
