import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

export interface UserAttributes {
  id: number;
  name: string;
  email: string;
  password_hash: string;
  role_id: number;
  is_active: boolean;
  reset_token?: string | null;
  reset_token_expiry?: Date | null;
  deleted_at?: Date | null;
  created_at?: Date;
  updated_at?: Date;
}
interface UserCreationAttributes extends Optional<UserAttributes, 'id' | 'is_active'> {}

class User extends Model<UserAttributes, UserCreationAttributes> implements UserAttributes {
  public id!: number;
  public name!: string;
  public email!: string;
  public password_hash!: string;
  public role_id!: number;
  public is_active!: boolean;
  public reset_token!: string | null;
  public reset_token_expiry!: Date | null;
  public deleted_at!: Date | null;
  public readonly created_at!: Date;
  public readonly updated_at!: Date;
}

User.init({
  id:                 { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  name:               { type: DataTypes.STRING(100), allowNull: false },
  email:              { type: DataTypes.STRING(150), allowNull: false, unique: true },
  password_hash:      { type: DataTypes.STRING(255), allowNull: false },
  role_id:            { type: DataTypes.INTEGER, allowNull: false },
  is_active:          { type: DataTypes.BOOLEAN, defaultValue: true },
  reset_token:        { type: DataTypes.STRING(255), allowNull: true },
  reset_token_expiry: { type: DataTypes.DATE, allowNull: true },
  deleted_at:         { type: DataTypes.DATE, allowNull: true },
}, {
  sequelize,
  tableName: 'users',
  paranoid: true,
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  deletedAt: 'deleted_at',
});

export default User;