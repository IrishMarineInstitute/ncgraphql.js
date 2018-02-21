'use strict';
const fs = require('fs');
const chai = require('chai');
chai.use(require('chai-string'));
const expect = chai.expect;
const ncGraphQL = require('../index.js');
describe('ncGraphQL', function() {
	describe('local netcdf file',function(){
		var nc = fs.readFileSync("test/data/X193.1.186.252.36.9.40.6-nc3.nc");
		var ncgraphql;
    it('Should return a new ncGraphQL object', function() {
        ncgraphql = new ncGraphQL(nc);
        expect(ncgraphql).to.exist;
    });
		it('Should return something for query {ncdump}',function(){
			 return ncgraphql.query('{ncdump}').then(function(result){
				 expect(result).to.exist;
				 expect(result).to.have.own.property('ncdump');
				 expect(result.ncdump).to.have.own.property('variables');
				 expect(result.ncdump).to.have.own.property('dimensions');
				 expect(result.ncdump).to.have.own.property('globalAttributes');
				})
		});
		it('Should return lots of data for query {data{lat lon time sst}}',function(){
			 return ncgraphql.query('{data{lat lon time sst}}').then(function(result){
				 expect(result).to.exist;
				 expect(result).to.have.own.property('data');
				 expect(result.data.length).to.equal(147240);
				 expect(result.data[0]).to.have.own.property('lat');
				 expect(result.data[0]).to.have.own.property('lon');
				 expect(result.data[0]).to.have.own.property('time');
				 expect(result.data[0]).to.have.own.property('sst');
				})
		});
		it('Should return something for query {data{lat}}',function(){
			 return ncgraphql.query('{data{lat}}').then(function(result){
				 expect(result).to.exist;
				 expect(result).to.have.own.property('data');
				 expect(result.data.length).to.equal(2);
				 expect(result.data[0]).to.have.own.property('lat');
				 expect(result.data[0].lat).to.equal(54);
				})
		});
		it('Should return graphql query for query {graphql_example}',function(){
			 return ncgraphql.query('{graphql_example}').then(function(result){
				 expect(result).to.exist;
				 expect(result).to.have.own.property('graphql_example');
				 expect(typeof result.graphql_example).to.equal("string");
				 expect(result.graphql_example).to.startsWith("{");
				 expect(result.graphql_example).to.equal(`{
  lat_lon_time{
    lat
    lon
    time
    sst
  }
  nbnds_time{
    nbnds
    time
    time_bnds
  }
}`);
				})
		});
	});
	describe('netcdf strings',function(){
		var nc = fs.readFileSync("test/data/madis-sao.nc");
		var ncgraphql;
		it('Should return a new ncGraphQL object', function() {
				ncgraphql = new ncGraphQL(nc);
				expect(ncgraphql).to.exist;
		});
		it('Should handle null terminated strings',function(){
			return ncgraphql.query('{data{ recNum timeObs precip1HourDD}}').then(function(result){
				expect(result.data[0].precip1HourDD).to.equal('Z');
			});
		});
		it('Should index recNum',function(){
			return ncgraphql.query('{data{ recNum timeObs precip1HourDD}}').then(function(result){
				expect(result.data[0].recNum).to.equal(0);
				expect(result.data[1].recNum).to.equal(1);
				expect(result.data[2].recNum).to.equal(2);
			});
		})
	})
	describe('http netcdf file',function(){
		var url = "https://github.com/cheminfo-js/netcdfjs/blob/master/test/files/ichthyop.nc?raw=true";
		var ncgraphql;
    it('Should return a new ncGraphQL object', function() {
        ncgraphql = new ncGraphQL(url);
        expect(ncgraphql).to.exist;
    });
		it('Should return something for query {ncdump}',function(){
			 return ncgraphql.query('{ncdump}').then(function(result){
				 expect(result).to.exist;
				 expect(result).to.have.own.property('ncdump');
				 expect(result.ncdump).to.have.own.property('variables');
				 expect(result.ncdump).to.have.own.property('dimensions');
				 expect(result.ncdump).to.have.own.property('globalAttributes');
				})
		});
		it('Should return lots of data for query {data{lat lon time sst}}',function(){
			 return ncgraphql.query('{data{lat lon time sst}}').then(function(result){
				 expect(result).to.exist;
				 expect(result).to.have.own.property('data');
				 expect(result.data.length).to.equal(49000);
				 expect(result.data[0]).to.have.own.property('lat');
				 expect(result.data[0]).to.have.own.property('lon');
				 expect(result.data[0]).to.have.own.property('time');
				 expect(result.data[0]).to.have.own.property('sst');
				 expect(result.data[0].sst).to.be.null;
				 expect(result.data[0].lat).to.equal(53.26256561279297);
				})
		});
		it('Should return something for query {data{lat}}',function(){
			 return ncgraphql.query('{data{lat}}').then(function(result){
				 expect(result).to.exist;
				 expect(result).to.have.own.property('data');
				 expect(result.data.length).to.equal(49000);
				 expect(result.data[0]).to.have.own.property('lat');
				 expect(result.data[0].lat).to.equal(53.26256561279297);
				})
		});
		it('Should be able to execute a simple query for drifter_time and edge_latlon',function(){
			var query = `{drifter_time{drifter time lon lat mortality depth } edge_latlon{edge latlon region_edge}}`;
			return ncgraphql.query(query).then(function(result){
				expect(result).to.have.own.property('drifter_time');
				expect(result.drifter_time.length).to.equal(49000);
				expect(result).to.have.own.property('edge_latlon');
				expect(result.edge_latlon.length).to.equal(4312);
			});
		})
		it('Should be able to execute the result of {graphql_example} query',function(){
			return ncgraphql.query('{graphql_example}').then(function(result){
				ncgraphql.query(result.graphql_example).then(function(result){
					expect(result).to.have.own.property('drifter_time');
					expect(result.drifter_time.length).to.equal(49000);
					expect(result).to.have.own.property('edge_latlon');
					expect(result.edge_latlon.length).to.equal(4312);
				});
			});
		});
	});
});
/*
const query = `{
	ncdump
# ncdump{
#	 dimensions {
#		 name
#		 size
#	 }
#	 variables
# }
#	 {
#		 name
#		 type
#		 dimensions
#	 }
#	 globalAttributes
# }

#	app_time_initial_time
#	transport_dimension
#	data(time: {min: 1547107200, max: 1547107300}){
#		time
#		location(lat: {min: 53.261, max: 53.262}) {
#			lat
#			lon
#		}
#	}
 data{
		time
		lat
		lon
		sst
}
}`;

if(false) new ncGraphQL(data).query(query).then(function(result) {
	console.log("time,lat,lon,sst");
	result.data.filter(function(x) {
		return x.sst != null
	}).forEach(function(x) {
		console.log('"' + x.time.toISOString().substring(0, 10).replace(/-/g, "/") + '",' + x.lat + "," + x.lon + "," + x.sst);
	})
},function(e){
	console.log(e);
});

var url = "https://github.com/cheminfo-js/netcdfjs/blob/master/test/files/ichthyop.nc?raw=true";
var nc = new ncGraphQL(url);
if(false)nc.query('{ncdump}').then(function(result){
		console.log(JSON.stringify(result,null,2));
	}).catch(function(reason){
		console.log("Error",reason);
	});

if(true)nc.query('{data{time,sst}}').then(function(result){
	result.data.forEach(function(x){
		console.log(x.time);
	});
}).catch(function(reason){
	console.log("Error2",reason);
});
*/
