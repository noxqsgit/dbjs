//  --                                                            {{{1
//
//  File        : examples.js
//  Maintainer  : Felix C. Stegerman <felixstegerman@noxqslabs.nl>
//  Date        : 2012-04-18
//
//  Copyright   : Copyright (C) 2012  Felix C. Stegerman
//  Licence     : GPLv2 or EPLv1
//
//  Description : Overview of current (97ef210) features.
//
//  --                                                            }}}1

var dbName  = 'foo';                  // name
var dbDef   = {                       // definition
  version : '1.0' ,                   // version
  desc    : '...' ,                   // description
  size    : 200000,                   // expected size ???
  tables  : {                         // tables
    foo : tools.split_co ('x TEXT, y INTEGER'), // split on commas
    bar : ['z TEXT'],                           // or pass array
  }
};


// perform database actions; in-order
dbjs.do (dbName, dbDef, function (dbo) { return [

  //  Usage: dbjs.do (name, def[, f, f_error]) -> none
  //
  //
  //  The database object (dbo) has functions for each table to
  //  insert/update/delete/query; for a table named foo:
  //    .iFoo (or .i_foo) --> an insertion  function
  //    .uFoo (or .u_foo) --> an update     function
  //    .dFoo (or .d_foo) --> a  deletion   function
  //    .qFoo (or .q_foo) --> a  query      function
  //
  //  Usage:
  //    .qFoo (          f[, f_error, where]) (...) -> none
  //    .iFoo (records[, f , f_error])        (...) -> none
  //    .uFoo (records[, f , f_error])        (...) -> none
  //    .dFoo (          f[, f_error, where]) (...) -> none
  //
  //  You can also dump/load the entire database:
  //    .dump (f[, f_error, f_dump])    (...) -> none
  //    .load (data[, f_error, f_load]) (...) -> none
  //
  //
  //  The dbjs object has functions to constuct WHERE clauses for
  //  updates/deletions/queries:
  //    .eq   (x, y)  --> x ==  y
  //    .ne   (x, y)  --> x !=  y
  //    .ge   (x, y)  --> x >=  y
  //    .gt   (x, y)  --> x >   y
  //    .le   (x, y)  --> x <=  y
  //    .lt   (x, y)  --> x <   y
  //    .and  (x, y)  --> x AND y
  //    .or   (x, y)  --> x OR  y
  //    .id   (x)     --> id == x
  //
  //
  //  You can also set dbjs.DEBUG to false to hide debugging output.
  //  And the default error callback function dbjs.error_cb logs
  //  errors to the console.


  // insert records
  dbo.iFoo ([
    { x: 'foo', y: 37 },
    { x: 'bar', y: 42 },
  ]),

  // insert records w/ optional callback for insertion id list)
  dbo.iFoo ([
    { x: 'baz', y: 99 },
  ], function (ids) { console.log ('ids=', ids); }),


  // update records w/ optional callback for affected rows list;
  // the _W_ attribute provides the WHERE clause
  dbo.uFoo ([
    { y: -1, _W_: dbjs.eq ('id', 2) },
  ], function (aff) { console.log ('aff=', aff); }),


  // query records -> callback; w/ optional filter
  dbo.qFoo (function (i, x) {
    console.log ('#=' + i, 'id=' + x.id, 'obj=', x);
  }, none, dbjs.and (dbjs.ne ('id', 7), dbjs.gt ('id', 4)) ),


  // delete records w/ optional callback for # affected rows
  dbo.dFoo (
    function (aff) { console.log ('aff=', aff); }),
    none, dbjs.gt ('id', 10)
  ),


  // dump DB
  dbo.dump (function (data) { console.log ('dump=', data); }),


  // load DB (you need to delete the DB first)
  // dbo.load (data),


  // you can define your own callback functions as well
  // function (tx) { ... }, ...


  // NB: you should probably set event handlers that use the database
  // here, after the initialisation.

  // NB: you can nest dbjs.do calls w/out redefining:
  // dbjs.do (dbName, none, ...);

]; });

//  --
