var request = require('request');
var requestPromise = require('request-promise');
var express = require('express');
var graphqlHTTP = require('express-graphql');
var { buildSchema } = require('graphql');

// Construct a schema, using GraphQL schema language
var schema = buildSchema(`
  type Query {
    hello: String
    search(query : String!) : City 
  }
  
  type GPS {
    longitude: Float
    latitude: Float
  }
  
  type City {
    coordinates: GPS
    zipCode: String
    city: String
  }
`);

class GPS {
    constructor() {
        this.longitude
        this.latitude
    }
}
class City {
    constructor() {
        this.coordinates
        this.zipCode
        this.city
    }
}

// The root provides a resolver function for each API endpoint
var root = {
    hello: () => {
        return 'Hello world!';
    },
    search: searchCity,
};

function searchCity({query}) {
    console.log(query)
  var options = {
    uri: `https://api-adresse.data.gouv.fr/search/?q=${query}`,
    json: true
  };

  return requestPromise(options)
    .then(function(json) {
        console.log(JSON.stringify(json))
        console.log(JSON.stringify(json.query))
        return json;
        //console.log(json.features[0].geometry)
        //console.log(json.features[0].properties)
        //console.log(json.features[1].geometry)
        //console.log(json.features[1].properties)
    })
    .then(function(json) {
        var gps = new GPS();
        gps.longitude = json.features[0].geometry.coordinates[0];
        gps.latitude = json.features[0].geometry.coordinates[1];

        var city = new City();
        city.zipCode = json.features[0].citycode;
        city.coordinates = gps;

        return city;
    })
}

var app = express();
app.use('/graphql', graphqlHTTP({
    schema: schema,
    rootValue: root,
    graphiql: true,
}));
app.listen(4000);
console.log('Running a GraphQL API server at localhost:4000/graphql');
