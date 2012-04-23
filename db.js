//  --                                                            {{{1
//
//  File        : db.js
//  Maintainer  : Felix C. Stegerman <felixstegerman@noxqslabs.nl>
//  Date        : 2012-04-23
//
//  Copyright   : Copyright (C) 2012  Felix C. Stegerman
//  Licence     : GPLv2 or EPLv1
//
//  Depends     : ...
//  Description : ...
//
//  TODO        : ...
//
//  --                                                            }}}1

this.dbjs.DEBUG = true;

//  --

(function (_this) {

//  --

var db  = _this.dbjs;
var DB  = {};

//  --

db.log  = function () { console.log.apply (console, arguments); };

//  --

db.eq   = db._cmp ('==' );
db.ne   = db._cmp ('!=' );

db.ge   = db._cmp ('>=' );
db.gt   = db._cmp ('>'  );

db.le   = db._cmp ('<=' );
db.lt   = db._cmp ('<'  );

db.and  = db._cps ('AND');
db.or   = db._cps ('OR' );


db.id   = function (id) { return db.eq ('id', id); }

//  --

//
//  :: error_cb ([tx,] e) -> none
//
//  Depends     : log.
//  Description : default error callback; logs to console.
//

db.error_cb = function () {                                   //  {{{1
  tools.chk_args (arguments, 1, 2);

  if (arguments.length == 1) {
    db.log ('SQL Error:', arguments[0].message);              //  !!!!
  }
  else {
    db.log ('SQL Transaction Error:', arguments[1].message);  //  !!!!
  }
}                                                             //  }}}1

// --

//
//  :: _seq (dbo)(fs, f_error) -> none
//
//  Depends     : _with.
//  Description : sequences db functions.
//

db._seq = function (dbo) {                                    //  {{{1
  tools.chk_args (arguments, 1, 1);

  var w = db._with (dbo);

  return function (fs, f_error) {
    tools.chk_args (arguments, 2, 2);

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
//  :: _dump (dbo)(f[, f_error, f_dump])([tx]) -> none
//
//  Description : dumps the DB.
//

db._dump = function (dbo) {                                   //  {{{1
  tools.chk_args (arguments, 1, 1);

  return function (f, f_error, f_dump) {
    tools.chk_args (arguments, 1, 3);

    var f_err = f_error || db.error_cb;
    var f_d   = f_error || tools.to_json;

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
//  :: _load (dbo)(data[, f_error, f_load])([tx]) -> none
//
//  Description : loads the DB.
//

db._load = function (dbo) {                                   //  {{{1
  tools.chk_args (arguments, 1, 1);

  return function (data, f_error, f_dump) {
    tools.chk_args (arguments, 1, 3);

    var f_err = f_error || db.error_cb;
    var f_d   = f_error || tools.from_json;

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
//  :: _defns (dbo) -> none
//
//  Depends     : _{dump,load,query,insert,update}.
//  Description : defines table functions in DB obj.
//

db._defns = function (dbo) {                                  //  {{{1
  tools.chk_args (arguments, 1, 1);

  dbo.dump = db._dump (dbo);
  dbo.load = db._load (dbo);

  for (var t_ in dbo.tables) {
    (function (t) {
      var T = t[0].toUpperCase () + t.substr (1);

      //  !!!! {

      // _query   (table, fields,           f[, f_error, where])
      // _insert  (table, fields, records[, f , f_error])
      // _update  (table, fields, records[, f , f_error, where_key])
      // _delete  (table, where ,        [, f , f_error])

      dbo['q_' + t] = dbo['q' + T] = function (f, f_error, w) {
        tools.chk_args (arguments, 1, 3);

        return db._query (t, dbo.fields[t], f, f_error, w);
      };

      dbo['i_' + t] = dbo['i' + T] = function (records, f, f_error) {
        tools.chk_args (arguments, 1, 3);

        return db._insert (t, dbo.fields[t], records, f, f_error);
      };

      dbo['u_' + t] = dbo['u' + T] = function (records, f, f_error) {
        tools.chk_args (arguments, 1, 3);

        return db._update (t, dbo.fields[t], records, f, f_error);
      };

      dbo['d_' + t] = dbo['d' + T] = function (w, f, f_error) {
        tools.chk_args (arguments, 1, 3);

        return db._delete (t, w, f, f_error);
      };

      //  } !!!!
    })(t_);
  }
}                                                             //  }}}1

//  --

//
//  :: w (name, def[, f, f_error]) -> none
//
//  Depends     : DB, _seq, _create_table, _defns; error_cb.
//  Description : defines database; runs functions.
//

db.w = function (name, def, f, f_error) {                     //  {{{1
  tools.chk_args (arguments, 2, 4);

  var f_    = f       || function () { return []; };
  var f_err = f_error || db.error_cb;

  if (def == none) {
    var dbo = DB[name];                                       //  !!!!
    var fs  = [];                                             //  !!!!
  }
  else {
    var dbo = DB[name] = {                                    //  !!!!
      name    : name          ,
      version : def.version   ,
      desc    : def.desc      ,
      size    : def.size      ,
      tables  : def.tables    ,
      fields  : {}            ,
    };

    dbo.seq = db._seq (dbo);                                  //  !!!!

    var fs = [ function (tx) {                                //  !!!!
      for (var k in def.tables) {
        db._create_table (k, def.tables, f_err)(tx);
      }
    } ]

    for (var k in def.tables) {
      dbo.fields[k] = def.tables[k].map (                     //  !!!!
        function (x) { return tools.split_ws (x)[0]; }
      );
    }

    db._defns (dbo);                                          //  !!!!
  }

  dbo.seq (fs.concat (f_ (dbo)), f_err);                      //  !!!!
}                                                             //  }}}1

//  --

})(this);

//  --

//  vim: set tw=70 sw=2 sts=2 et fdm=marker :
