module.exports = (sequelize, DataTypes) => {
  const Integration = sequelize.define('integration', {
    projectId: DataTypes.INTEGER,
    projectFullName: DataTypes.STRING
  }, {
    timestamps: false
  });

  return Integration;
};