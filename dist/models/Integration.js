'use strict';

module.exports = function (sequelize, DataTypes) {
  var Integration = sequelize.define('integration', {
    projectId: DataTypes.INTEGER,
    projectFullName: DataTypes.STRING
  }, {
    timestamps: false
  });

  return Integration;
};