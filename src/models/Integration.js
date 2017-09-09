module.exports = (sequelize, DataTypes) => {
  const Integration = sequelize.define('integration', {
    spaceWikiName: DataTypes.STRING,
    spaceName: DataTypes.STRING
  }, {
    timestamps: false
  });

  return Integration;
};