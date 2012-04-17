var dbName  = 'foo';
var dbDef   = {
  version : '1.0' ,
  desc    : '...' ,
  size    : 200000,
  tables  : {
    foo : tools.split_co ('x TEXT, y INTEGER'),
    bar : ['z TEXT'],
  }
};

dbjs.do (dbName, dbDef, function (dbo) { return [

  // insert records
  dbo.iFoo ([
    { x: 'foo', y: 37 },
    { x: 'bar', y: 42 },
  ]),

  // insert records w/ callback for insertion ids
  dbo.iFoo ([
    { x: 'baz', y: 99 },
  ], function (ids) { console.log ('ids=', ids); }),


  // update records
  dbo.uFoo ([
    { y: -1, _W_: dbjs.eq ('id', 2) },
  ]),


  // query records / callback; w/ filter
  dbo.qFoo (function (i, x) {
    console.log ('#=' + i, 'id=' + x.id, 'obj=', x);
  }, none, dbjs.and (dbjs.ne ('id', 7), dbjs.gt ('id', 4)) ),


  // dump DB
  dbo.dump (function (data) { console.log ('dump=', data); }),


  // load DB (you need to delete the DB first)
  // dbo.load (data),


  // function (tx) { ... }, ...


  // NB: you should probably set event handlers that use the database
  // here, after the initialisation.

  // NB: you can nest do calls w/out redefining:
  // dbjs.do (dbName, none, ...);

]; });
