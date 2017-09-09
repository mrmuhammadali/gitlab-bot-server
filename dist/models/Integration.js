'use strict';

module.exports = function (sequelize, DataTypes) {
  var Integration = sequelize.define('integration', {
    spaceWikiName: DataTypes.STRING,
    spaceName: DataTypes.STRING
  }, {
    timestamps: false
  });

  return Integration;
};