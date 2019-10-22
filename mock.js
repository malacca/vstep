/**
 * 本地 sqlite 数据库
 */
let _database;
const database = () => {
    if (!_database) {
        _database = openDatabase('mock', '1.0', 'Mock DB', 2 * 1024 * 1024);
        if (_database) {
            _database.transaction(function (tx) {  
                tx.executeSql('CREATE TABLE IF NOT EXISTS Account (\
                    id INTEGER PRIMARY KEY, \
                    top INT, \
                    phone VARCHAR, \
                    pwd VARCHAR,\
                    name VARCHAR,\
                    security INT,\
                    money DECIMAL,\
                    join_time INT,\
                    login_time INT,\
                    disable INT\
                )', [], null,  function(tx, err){
                    throw(`execute sql failed: ${err.code} ${err.message}`);
                });
            });
        }
    }
    return _database;
};
const executeTx = (tx, sql, bind) => {
    bind = bind||[];
    return new Promise((resolve, reject) => {
        tx.executeSql(sql, bind, (tx, rs) => {
            resolve({tx, rs});
        }, (tx, err) => {
            reject(err);
        })
    })
};
const execute = (sql, bind) => {
    const db = database();
    bind = bind||[];
    return new Promise((resolve, reject) => {
        _database.transaction((tx) => {
            tx.executeSql(sql, bind, (tx, rs) => {
                resolve({rs, tx});
            }, (tx, err) => {
                reject(err);
            }) 
        });
    })
};
const replace = (table, row, update) => {
    let values = [];
    const fields = [];
    const placeholder = [];
    for (let key in row) {
        fields.push(key);
        values.push(row[key]);
        placeholder.push('?')
    }
    if (!update) {
        return execute("INSERT INTO " + table+ " ("+fields.join(',')+") VALUES ("+placeholder.join(',')+")", values);
    }
    let conrow;
    const condition = [];
    for (let key in update) {
        conrow = update[key];
        if (Array.isArray(conrow)) {
            condition.push(key + ' IN ('+Array(conrow.length).fill('?').join(',')+')');
            values = values.concat(conrow);
        } else {
            condition.push(key + '=?');
            values.push(conrow);
        }
    }
    let sql = fields.join('=?,') + '=?';
    sql = "UPDATE "+ table + " SET " + sql + " WHERE "+ condition.join(' AND ');
    return execute(sql, values);
};




/**
 * 账户数据表
 */

const formatAccount = (row) => {
    var d = new Date(row.join_time);
    row.join_time = (d.getMonth() + 1) + '-' + d.getDate() + ' ' +  d.getHours() + ':' + d.getMinutes();
    row.money = row.money ? row.money : 0;
    row.security = row.security ? '是' : '否';
    row.name = row.name ? row.name : '无';
    row.disable = !!row.disable;
    row.top = !row.top;
    return row;
};
const listAccount = (json) => {
    const condition = [];
    let where = ' WHERE top=?';
    condition.push(json.topid ? json.topid : 0);
    if (json.keyword) {
        where += ' AND phone LIKE ?';
        condition.push('%'+json.keyword+'%')
    }
    return execute('SELECT COUNT(*) AS d FROM Account'+where, condition).then(({rs, tx}) => {
        const total = rs.rows[0].d;
        const lists = [];
        let order = [];
        for (let k in json.sorts) {
            order.push('`'+k+'` ' + (json.sorts[k] ? 'DESC' : 'ASC'));
        }
        order.push('`id` DESC');
        order = ' ORDER BY ' + order.join(',');
        order += ' LIMIT ' + (json.page-1) * json.offset + ',' + json.offset;
        return executeTx(tx, "SELECT * FROM Account"+where+order, condition).then(({rs}) => {
            var len = rs.rows.length, i;
            for (i = 0; i < len; i++){
                lists.push(formatAccount(rs.rows.item(i)))
            }
            return {
                code:0,
                data:{total, lists}
            }
        })
    })
};
const getAccount = (json) => {
    return execute('SELECT phone FROM Account WHERE id='+json.id).then(({rs, tx}) => {
        return rs.rows.item(0)
    });
};
const saveAccount = (json) => {
    if (json.link === 'add' || json.link === 'addson') {
        const row = {
            top: 0,
            phone: json.phone,
            pwd: json.pwd,
            join_time: Date.now()
        };
        if (json.link === 'addson'){
            row.top = json.id;
        }
        return replace('Account', row).then(({rs, tx}) => {
            if (json.link !== 'addson') {
                return null;
            }
            return executeTx(tx, "SELECT * FROM Account WhERE id="+rs.insertId).then(({rs}) => {
                return formatAccount(rs.rows.item(0))
            });
        })
    }
    const row = {
        phone: json.phone,
    };
    if (json.pwd) {
        row.pwd = json.pwd
    }
    return replace('Account', row, {
        id: json.id
    })
};
const disableAccount = (json, enable) => {
    return replace('Account', {
        disable: enable ? 0 : 1
    }, {
        id: json.id
    }).then(rs => {
        return {
            code:0,
            message:'操作成功'
        }
    })
};
const deleteAccount = (json) => {
    return execute("DELETE FROM Account WHERE id = ? OR top = ?", [json.id, json.id]).then(() => {
        return {
            code:0,
            message:'操作成功'
        }
    })
};



export default {
    '/auth': (req, res) => {
        const user = localStorage.getItem(':user');
        if (!user) {
            res.status(401).send({});
            return;
        }
        return res.send({
            uid: 1,
            name:user
        })
    },
    '/login': [(req, res) => {
          return req.json().then(json => {
              if (json.user === 'admin' || json.user === 'user') {
                localStorage.setItem(':user', json.user);
                res.send({
                    code:0,
                    message:null,
                    data: {
                        uid: 1,
                        name: json.user
                    }
                })
              } else {
                res.send({
                    code:300,
                    message: '你输入的账号或密码不正确',
                    data: {
                        uid: 1,
                        name: 'user'
                    }
                })
              }
        })
    }, 1500],
    '/logout': [(req, res) => {
        localStorage.removeItem(':user');
        return res.send({
            code:0,
            message:null,
            data: null
        })
    }, 1500],
    '/account': (req, res) => {
        return req.json().then(json => {
            return listAccount(json)
        }).then(rs => {
            return res.send(rs)
        })
    },
    '/account/edit': (req, res) => {
        return req.json().then(json => {
            return getAccount(json)
        }).then(rs => {
            return res.send(rs)
        })
    },
    '/account/save': (req, res) => {
        return req.json().then(json => {
            return saveAccount(json)
        }).then(data => {
            return res.send({
                code:0,
                message:'成功保存数据',
                data
            })
        }).catch(err => {
            return res.send({
                code:500,
                message:'保存数据失败'
            })
        })
    },
    '/account/disable': (req, res) => {
        return req.json().then(json => {
            return disableAccount(json)
        }).then(rs => {
            return res.send(rs)
        })
    },
    '/account/enable': (req, res) => {
        return req.json().then(json => {
            return disableAccount(json, true)
        }).then(rs => {
            return res.send(rs)
        })
    },
    '/account/delete': (req, res) => {
        return req.json().then(json => {
            return deleteAccount(json, true)
        }).then(rs => {
            return res.send(rs)
        })
    },

    '/menus': [
        {
            name: '管理',
            title: '控制面板',
            icon: 'news',
            menus: [
                {
                    name: '控制面板',
                    icon: 'files',
                    link: '/',
                    path: 'dashboard',
                    greedy: false
                },
                {
                    name: '会员管理',
                    icon: 'user',
                    link: '/account',
                    path: 'account',
                    greedy: true
                }
            ]
        },
    ],
};