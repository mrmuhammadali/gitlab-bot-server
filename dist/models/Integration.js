'use strict';

module.exports = function (sequelize, DataTypes) {
  var Integration = sequelize.define('integration', {
    projectId: DataTypes.STRING,
    projectFullName: DataTypes.STRING
  }, {
    timestamps: false
  });

  return Integration;
};