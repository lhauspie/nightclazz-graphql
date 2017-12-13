var request = require('request');
var requestPromise = require('request-promise');
var express = require('express');
var graphqlHTTP = require('express-graphql');
var {buildSchema} = require('graphql');

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
  
  type NearestAntenna {
    coordinates: GPS
    generation: String
    provider: String
    lastUpdate: String
    status: String
    dist: Int
    addressLabel: String
    city: String
    insee: String
  }

  type City {
    coordinates: GPS
    zipCode: String
    city: String
    nearestAntenna(generation: String, provider: String): NearestAntenna
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

    nearestAntenna({generation, provider}) {
        var options = {
            uri: `https://data.anfr.fr/api/records/1.0/search/?dataset=observatoire_2g_3g_4g&geofilter.distance=${this.coordinates.latitude}%2C${this.coordinates.longitude}%2C100&refine.adm_lb_nom=${provider}`,
            json: true
        };

        return requestPromise(options)
            .then(function (json) {
                console.log("###############")
                console.log(JSON.stringify(json))
//                console.log(JSON.stringify(json.parameters))
                return json;
                //console.log(json.features[0].geometry)
                //console.log(json.features[0].properties)
                //console.log(json.features[1].geometry)
                //console.log(json.features[1].properties)
            })
            .then(function (json) {
                var gps = new GPS();
                gps.longitude = json.records[0].fields.coordonnees[0]
                gps.latitude = json.records[0].fields.coordonnees[1]
                var nearestAntenna = new NearestAntenna()
                nearestAntenna.coordinates = gps
                nearestAntenna.generation = json.records[0].fields.generation
                nearestAntenna.provider = json.records[0].fields.adm_lb_nom
                nearestAntenna.lastUpdate = json.records[0].fields.date_maj
                nearestAntenna.status = json.records[0].fields.en_service
                nearestAntenna.dist = json.records[0].fields.dist
                nearestAntenna.addressLabel = json.records[0].fields.adr_lb_add1
                nearestAntenna.city = json.records[0].fields.nom_com
                nearestAntenna.insee = json.records[0].fields.code_insee

                return nearestAntenna
            })
    }
}

class NearestAntenna {
    constructor() {
        this.coordinates
        this.generation
        this.provider
        this.lastUpdate
        this.status
        this.dist
        this.addressLabel
        this.city
        this.insee
    }
}

// The root provides a resolver function for each API endpoint
var root = {
    search: searchCity,
};

function searchCity({query}) {
    console.log(query)
    var options = {
        uri: `https://api-adresse.data.gouv.fr/search/?q=${query}`,
        json: true
    };

    return requestPromise(options)
        .then(function (json) {
            console.log(JSON.stringify(json))
            console.log(JSON.stringify(json.query))
            return json;
            //console.log(json.features[0].geometry)
            //console.log(json.features[0].properties)
            //console.log(json.features[1].geometry)
            //console.log(json.features[1].properties)
        })
        .then(function (json) {
            var gps = new GPS();
            gps.longitude = json.features[0].geometry.coordinates[0];
            gps.latitude = json.features[0].geometry.coordinates[1];

            var city = new City();
            city.zipCode = json.features[0].properties.citycode;
            city.coordinates = gps;
            city.city = json.features[0].properties.city;

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
