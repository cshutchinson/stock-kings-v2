var express = require('express');
var router = express.Router();

var knex = require('../db/knex');


/* GET home page. */
router.get('/', function(req, res) {
  knex('symbols').select().orderBy('id', 'asc')
  .then(function(symbols){
    res.json(symbols);
  })
});

router.get('/prices', function(req, res){
  knex('symbols').select().orderBy('id', 'asc')
  .then(function(symbols){
    res.json(symbols);
  })
});

module.exports = router;
