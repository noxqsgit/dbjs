//  --                                                          # {{{1
//
//  File        : db.js
//  Maintainer  : Felix C. Stegerman <felixstegerman@noxqslabs.nl>
//  Date        : 2012-03-18
//
//  Copyright   : Copyright (C) 2012  Felix C. Stegerman
//  Licence     : GPLv2 or EPLv1
//
//  TODO        : ...
//
//  --                                                          # }}}1

var DB_DEBUG  = true;
var _DB       = {};

//  --

// MOVE {

var none = undefined;


function _split_ws (s) { return s.trim ().split (/\s+/    ); }
function _split_co (s) { return s.trim ().split (/\s*,\s*/); }


function _die (s) { throw new Error (s); }

function _chk_args (a, n, m) {
  if (a.length < n || a.length > m) { _die ('wrong #args'); }
}

// } MOVE

//  --

//
//  :: _db_cmp (o)(x, y) -> <...>
//

function _db_cmp (o) {                                        //  {{{1
  return function (x, y) {
    return { expr: ' ' + x + ' ' + o + ' ? ', vals: [y] };
  };
}                                                             //  }}}1


//
//  :: _db_cps (o)(x, y, ...) -> <...>
//

function db_cps (o) {                                         //  {{{1
  var f = function (x, y) {
    if (arguments.length < 2) {
      _die ('too few args');                                  //  TODO
    }
    else if (arguments.length > 2) {
      var rest = Array.prototype.slice.call (arguments, 1);   //  WTF!

      return f (x, f.apply (null, rest));                     //  TODO
    }
    else {
      return  { expr: ' (' + x.expr + o + y.expr + ') '
              , vals: x.vals.concat (y.vals) };
    }
  };

  return f;
}                                                             //  }}}1

//  --

var db_eq   = db_cmp ('=='  );
var db_ne   = db_cmp ('!='  );

var db_ge   = db_cmp ('>='  );
var db_gt   = db_cmp ('>'   );

var db_le   = db_cmp ('<='  );
var db_lt   = db_cmp ('<'   );

var db_and  = db_cps ('AND' );
var db_or   = db_cps ('OR'  );

//  --

//
//  :: db_error_cb (e) -> none
//

function db_error_cb (e) {
  console.log ('SQL Error:', e.message);
}

// --

//
//  :: db_with (name)(f, f_success, f_error) -> none
//

function db_with (name) {                                     //  {{{1
  return function (f, f_success, f_error) {
    var db = window.openDatabase (
      name, DB[name].version, DB[name].desc, DB[name].size
    );
    db.transaction (f, f_error, f_success);
  };
}                                                             //  }}}1


//
//  :: db_seq (name)(fs, f_error) -> none
//

function db_seq (name) {                                      //  {{{1
  return function (fs, f_error) {
    var w = db_with (name);
    var f = function () {};

    for (var i = fs.length - 1; i >= 0; --i) {
      f = (function (g, h) {
        return function () { w (g, h, f_error); };
      })(fs[i], f);
    }

    return f ();
  };
}                                                             //  }}}1


//
//  :: db_defns (name) -> none
//

function db_defns (name) {                                    //  {{{1
  var d = DB[name];

  for (var t_ in d.tables) {
    (function (t) {
      var T = t[0].toUpperCase () + t.substr (1);

      DB[name]['q' + T] = function (f, f_error, w) {
        return db_query (t, d.fields[t], f, f_error, w);
      };

      DB[name]['i' + T] = function (records, f) {
        return db_insert (t, d.fields[t], records, f);
      };

      DB[name]['u' + T] = function (records) {
        return db_update (t, d.fields[t], records);
      };
    })(t_);
  }
}                                                             //  }}}1


//
//  :: db (name, def[, f, f_error]) -> none
//

function db (name, def, f, f_error) {                         //  {{{1
  var f_    = f       || function () { return []; };
  var f_err = f_error || db_error_cb;

  if (def == none) {
    DB[name].seq (f_ (DB[name]), f_err);

    return;                                                   //  !!!!
  }

  DB[name] = {
    name:     name          ,
    version:  def.version   ,
    desc:     def.desc      ,
    size:     def.size      ,
    tables:   def.tables    ,
    fields:   {}            ,
    seq:      db_seq (name) ,
  };

  for (var k in def.tables) {
    DB[name].fields[k] = def.tables[k].map (
      function (x) { return _split_ws (x)[0]; }
    );
  }

  db_defns (name);

  DB[name].seq (
    [ function (tx) {
        for (var k in def.tables) {
          var sql = 'CREATE TABLE IF NOT EXISTS '
                  + k + ' ( id INTEGER PRIMARY KEY, '
                  + def.tables[k].join (', ') + ' );';

          if (DEBUG) { console.log ('sql:', sql); }

          tx.executeSql (sql);
        }
      }
    ].concat (f_ (DB[name])), f_err
  )
}                                                             //  }}}1

// --

//
//  :: db_query (table, fields, f, f_error[, where]) -> none
//

function db_query (table, fields, f, f_error, where) {        //  {{{1
  return function (tx) {
    var sql = 'SELECT id, ' + fields.join (', ')
            + ' FROM ' + table
            + (where == none ? '' : ' WHERE ' + where.expr.trim ());

    if (DEBUG) {
      console.log ('sql:', sql);
      console.log ('vls:', where.vals);
    }

    var g = function (tx, rs) {
      if (DEBUG) { console.log ('res:', rs); }

      var len = rs.rows.length;

      for (var i = 0; i < len; ++i) {
        f (i, rs.rows.item(i));
      }
    };

    tx.executeSql (sql, where.vals, g, f_error);
  };
}                                                             //  }}}1


//
//  :: db_insert (table, fields, records[, f]) -> none
//

function db_insert (table, fields, records, f) {              //  {{{1
  return function (tx) {
    var qms = fields.map (function (x) { return '?'; }).join (', ');
    var ids = [];

    for (var i in records) {
      var sql = 'INSERT INTO ' + table
              + ' ( id, ' + fields.join (', ')
              + ' ) VALUES ( NULL, ' + qms + ' )';

      if (DEBUG) {
        console.log ('sql:', sql);
        console.log ('rec:', records[i]);
      }

      tx.executeSql (
        sql, fields.map (function (x) { return records[i][x]; }),
        function (tx, rs) {
          if (DEBUG) { console.log ('res:', rs); }

          ids.push (rs.insertId);
        }
      );
    }

    if (f != none) { f (ids); }
  };
}                                                             //  }}}1


//
//  :: db_update (table, fields, records[, where_key]) -> none
//

function db_update (table, fields, records, wk) {             //  {{{1
  wk_ = wk == none ? '_W_' : wk;

  return function (tx) {
    for (var i in records) {
      var fs = fields.filter (
        function (x) { return records[i][x] != none }
      );

      var r_vals  = fs.map (function (x) { return records[i][x]; });
      var w_vals  = records[i][wk_].vals;
      var vals    = r_vals.concat (w_vals);

      var sql
        = 'UPDATE ' + table + ' SET '
        + fs.map (function (x) { return x + ' = ?' }).join (', ')
        + ' WHERE ' + records[i][wk_].expr.trim ();

      if (DEBUG) {
        console.log ('sql:', sql);
        console.log ('vls:', vals);
        console.log ('rec:', records[i]);
      }

      tx.executeSql (sql, vals);
    }
  };
}                                                             //  }}}1

//  --

//  vim: set tw=70 sw=2 sts=2 et fdm=marker :
