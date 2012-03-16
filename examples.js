var dbName  = 'foo';
var dbDef   = {
  version : '1.0' ,
  desc    : '...' ,
  size    : 200000,
  tables  : {
    foo : _split_co ('x TEXT, y INTEGER'),
    bar : ['z TEXT'],
  }
};

db (dbName, dbDef);

db (dbName, none, function () { return [
  DB[dbName].iFoo ([
    { x: 'foo', y: 99 },
  ]),
]; });

db (dbName, none, function () { return [
  DB[dbName].uFoo ([
    { y: -1, _W_: 'id = ?', _V_: [3] },
  ]),
]; });

db (dbName, none, function () { return [
  DB[dbName].qFoo (function (i, x) {
    console.log ('#=' + i + ', id=' + x.id);
    console.log (x);
  } /* , none, 'id != ?', [2] */ ),
]; });

// ...
