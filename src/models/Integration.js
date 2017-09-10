module.exports = (sequelize, DataTypes) => {
  const Integration = sequelize.define('integration', {
    projectId: DataTypes.STRING,
    projectFullName: DataTypes.STRING
  }, {
    timestamps: false
  });

  return Integration;
};