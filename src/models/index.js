const Sequelize = require('sequelize');
import {DB_CONFIG_LOCAL} from "../utils"

const DB_CONFIG = DB_CONFIG_LOCAL

// console.log("Connection String: ", process.env.DATABASE_URL)
let sequelize = ''
if (process.env.DATABASE_URL) {
  sequelize = new Sequelize(process.env.DATABASE_URL, {options: {dialect: 'postgres'}})
} else {
  sequelize = new Sequelize(DB_CONFIG.name, DB_CONFIG.user, DB_CONFIG.password, DB_CONFIG.options)
}

const models = [
  'Chat',
  'Integration'
];
models.forEach((model) => {
  module.exports[model] = sequelize.import(__dirname + '/' + model );
});

// describe relationships
((m) => {
  m.Chat.hasMany(m.Integration, {foreignKey: 'chatId'});
  m.Integration.belongsTo(m.Chat, {foreignKey: 'chatId'});

  sequelize
    .authenticate()
    .then(() => {
      console.log('Connection has been established successfully.');
    })
    .catch(err => {
      console.error('Unable to connect to the database:', err);
    });
  sequelize.sync({force: true}).then(()=>{
    console.log("Successfully synced!!!")
  })
})(module.exports);

// export connection
module.exports.sequelize = sequelize;