var chai = require('chai');
var chaiHttp = require('chai-http');
var server = require('../server.js');
var should = chai.should();

chai.use(chaiHttp);

describe('Stores', function() {

    it('should list all zones on GET', function(done) {
        chai.request(server)
            .get('/ui/api/zones')
            .end(function(err, res) {
                if (err) console.log(err);
                if (res) console.log(res);
                res.should.have.status(200);
                res.should.be.json;
                res.body.should.be.a('array');
                done();
            });
    });

});