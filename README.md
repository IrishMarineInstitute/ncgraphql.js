# ncgraphql.js

Run a GraphQL query against a NetCDF (Version 3) file, without a server.

```js
  import ncGraphQL from 'nccraphql'
	var ncgraphql = new ncGrqphql(url);
	ncgraphql.query("{ncdump}").then(function(result){
		console.log(JSON.stringify(result.ncdump));
	});
```

[Try the Demo](https://irishmarineinstitute.github.io/ncgraphql.js/)

## Caveats:

* Only works for NetCDF version 3.
