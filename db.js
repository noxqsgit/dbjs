//  --                                                          # {{{1
//
//  File        : db.js
//  Maintainer  : Felix C. Stegerman <felixstegerman@noxqslabs.nl>
//  Date        : 2012-03-18
//
//  Copyright   : Copyright (C) 2012  Felix C. Stegerman
//  Licence     : GPLv2 or EPLv1
//
//  Depends     : ...
//  Description : ...
//
//  TODO        : ...
//
//  --                                                          # }}}1

var DB_DEBUG  = true;
var _DB       = {};

//  --

var db_log = function () { console.log.apply (console, arguments); }

//  --

var db_eq   = _db_cmp ('==' );
var db_ne   = _db_cmp ('!=' );

var db_ge   = _db_cmp ('>=' );
var db_gt   = _db_cmp ('>'  );

var db_le   = _db_cmp ('<=' );
var db_lt   = _db_cmp ('<'  );

var db_and  = _db_cps ('AND');
var db_or   = _db_cps ('OR' );


var db_id   = function (id) { return db_eq ('id', id); }

//  --

//
//  :: db_error_cb ([tx,] e) -> none
//
//  Depends     : db_log.
//  Description : default error callback; logs to console.
//

function db_error_cb () {                                     //  {{{1
  _chk_args (arguments, 1, 2);

  if (arguments.length == 1) {
    db_log ('SQL Error:', arguments[0].message);              //  !!!!
  }
  else {
    db_log ('SQL Transaction Error:', arguments[1].message);  //  !!!!
  }
}                                                             //  }}}1

// --

//
//  :: _db_seq (dbo)(fs, f_error) -> none
//
//  Depends     : _db_with.
//  Description : sequences db functions.
//

function _db_seq (dbo) {                                      //  {{{1
  _chk_args (arguments, 1, 1);

  var w = _db_with (dbo);

  return function (fs, f_error) {
    _chk_args (arguments, 2, 2);

    var f = function () {};

    for (var i = fs.length - 1; i >= 0; --i) {
      f = (function (g, h) {
        return function () { w (g, h, f_error); };            //  !!!!
      })(fs[i], f);
    }

    return f ();
  };
}                                                             //  }}}1

//  --

//
//  :: _db_dump (dbo)(f[, f_error, f_dump])([tx]) -> none
//
//  Description : dumps the DB.
//

function _db_dump (dbo) {                                     //  {{{1
  _chk_args (arguments, 1, 1);

  return function (f, f_error, f_dump) {
    _chk_args (arguments, 1, 3);

    var f_err = f_error || db_error_cb;
    var f_d   = f_error || _to_json;

    var fs    = [];                                           //  !!!!
    var recs  = {};                                           //  !!!!

    for (var t_ in dbo.tables) {
      recs[t_] = [];                                          //  !!!!

      (function (t) {
        fs.push (dbo['q_' + t] (function (i, x) {             //  !!!!
          recs[t].push (x);                                   //  !!!!
        } ));
      })(t_);
    }

    fs.push (function () { f (f_d (recs)); });                //  !!!!

    return function () { dbo.seq (fs, f_err); };              //  !!!!
  };
}                                                             //  }}}1


//
//  :: _db_load (dbo)(data[, f_error, f_load])([tx]) -> none
//
//  Description : loads the DB.
//

function _db_load (dbo) {                                     //  {{{1
  _chk_args (arguments, 1, 1);

  return function (data, f_error, f_dump) {
    _chk_args (arguments, 1, 3);

    var f_err = f_error || db_error_cb;
    var f_d   = f_error || _from_json;

    var recs  = f_d (data);                                   //  !!!!
    var fs    = [];                                           //  !!!!

    for (var t_ in dbo.tables) {
      fs.push (dbo['i_' + t_] (recs[t_]));
    }

    return function () { dbo.seq (fs, f_err); };              //  !!!!
  };
}                                                             //  }}}1

//  --

//
//  :: _db_defns (dbo) -> none
//
//  Depends     : _db_{dump,load,query,insert,update}.
//  Description : defines table functions in DB obj.
//

function _db_defns (dbo) {                                    //  {{{1
  _chk_args (arguments, 1, 1);

  dbo.dump = _db_dump (dbo);
  dbo.load = _db_load (dbo);

  for (var t_ in dbo.tables) {
    (function (t) {
      var T = t[0].toUpperCase () + t.substr (1);

      //  !!!! {

      dbo['q_' + t] = dbo['q' + T] = function (f, f_error, w) {
        _chk_args (arguments, 1, 3);

        return _db_query (t, dbo.fields[t], f, f_error, w);
      };

      dbo['i_' + t] = dbo['i' + T] = function (records, f, f_error) {
        _chk_args (arguments, 1, 3);

        return _db_insert (t, dbo.fields[t], records, f);
      };

      dbo['u_' + t] = dbo['u' + T] = function (records, f_error) {
        _chk_args (arguments, 1, 2);

        return _db_update (t, dbo.fields[t], records);
      };

      //  } !!!!
    })(t_);
  }
}                                                             //  }}}1

//  --

//
//  :: db (name, def[, f, f_error]) -> none
//
//  Depends     : _DB, _db_seq, _db_create_table, _db_defns;
//                db_error_cb.
//  Description : defines database; runs functions.
//

function db (name, def, f, f_error) {                         //  {{{1
  _chk_args (arguments, 2, 4);

  var f_    = f       || function () { return []; };
  var f_err = f_error || db_error_cb;

  if (def == none) {
    var dbo = _DB[name];                                      //  !!!!
    var fs  = [];                                             //  !!!!
  }
  else {
    var dbo = _DB[name] = {                                   //  !!!!
      name    : name          ,
      version : def.version   ,
      desc    : def.desc      ,
      size    : def.size      ,
      tables  : def.tables    ,
      fields  : {}            ,
    };

    dbo.seq = _db_seq (dbo);                                  //  !!!!

    var fs = [ function (tx) {                                //  !!!!
      for (var k in def.tables) {
        _db_create_table (k, def.tables, f_err)(tx);
      }
    } ]

    for (var k in def.tables) {
      dbo.fields[k] = def.tables[k].map (                     //  !!!!
        function (x) { return _split_ws (x)[0]; }
      );
    }

    _db_defns (dbo);                                          //  !!!!
  }

  dbo.seq (fs.concat (f_ (dbo)), f_err);                      //  !!!!
}                                                             //  }}}1

//  --

//  vim: set tw=70 sw=2 sts=2 et fdm=marker :
