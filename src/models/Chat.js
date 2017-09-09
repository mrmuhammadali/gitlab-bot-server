module.exports = (sequelize, DataTypes) => {
  const Chat = sequelize.define('chat', {
    chatId: {
      type: DataTypes.STRING,
      primaryKey: true
    },
    access_token: DataTypes.STRING,
    refresh_token: DataTypes.STRING,
    expires_at: DataTypes.DATE
  }, {
    timestamps: false
  });

  return Chat;
};