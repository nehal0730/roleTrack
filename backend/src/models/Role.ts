import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

interface RoleAttributes {
  id: number;
  name: 'admin' | 'project_manager' | 'employee';
  created_at?: Date;
}
interface RoleCreationAttributes extends Optional<RoleAttributes, 'id'> {}

class Role extends Model<RoleAttributes, RoleCreationAttributes> implements RoleAttributes {
  public id!: number;
  public name!: 'admin' | 'project_manager' | 'employee';
  public readonly created_at!: Date;
}

Role.init({
  id:   { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  name: { type: DataTypes.ENUM('admin','project_manager','employee'), allowNull: false, unique: true },
}, {
  sequelize,
  tableName: 'roles',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: false,
});

export default Role;