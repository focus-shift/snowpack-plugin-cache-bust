# snowpack-plugin-cache-bust

This [snowpack](https://www.snowpack.dev) plugin adds a content hash to your referenced scripts and stylesheets in html files.
The hash is created on `optimize` command. So this won't interfere developing with watch mode.

## Usage

Currently there is no published artifact in the npm registry. You have to add this plugin via github url.

```json
// package.json
{
  "devDependencies": {
    "snowpack-plugin-cache-bust": "git+ssh://git@github.com:focus-shift/snowpack-plugin-cache-bust.git"
  }
}
```

```js
// snowpack.config.js
{
  plugins: [
    ["snowpack-plugin-cache-bust", {
      netflify: false
    }]
  ],
}
```

### Example

```html
<link rel="stylesheet" href="/css/style.css" />
<script src="/js/app.js"></script>
```

will become

```html
<link rel="stylesheet" href="/css/style-12345.css" />
<script src="/js/app-abcdefg.js"></script>
```

### Plugin options

| Name       | Type      | Description                                                                                                              |
| :--------- | :-------- | :----------------------------------------------------------------------------------------------------------------------- |
| `netflify` | `boolean` | (_default: false_) Set this to `true` if you want a `_header` file to be created that enables cache-control for netlify. |

## TODOs

- replace `@import` in `css` files
- replace `import` in `js` files
- maybe there is a service-worker that preloads stuff with inlined paths
- add cache busting for other files like images
- any other stuff I didn't thought about yet...
