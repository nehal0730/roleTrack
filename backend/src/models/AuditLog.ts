import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

export interface AuditLogAttributes {
  id: number;
  user_id: number;
  action: string;
  entity_type: string;
  entity_id: number;
  previous_value?: object | null;
  new_value?: object | null;
  ip_address?: string | null;
  created_at?: Date;
}
interface AuditLogCreationAttributes extends Optional<AuditLogAttributes, 'id'> {}

class AuditLog extends Model<AuditLogAttributes, AuditLogCreationAttributes> implements AuditLogAttributes {
  public id!: number;
  public user_id!: number;
  public action!: string;
  public entity_type!: string;
  public entity_id!: number;
  public previous_value!: object | null;
  public new_value!: object | null;
  public ip_address!: string | null;
  public readonly created_at!: Date;
}

AuditLog.init({
  id:             { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  user_id:        { type: DataTypes.INTEGER, allowNull: false },
  action:         { type: DataTypes.STRING(100), allowNull: false },
  entity_type:    { type: DataTypes.STRING(50), allowNull: false },
  entity_id:      { type: DataTypes.INTEGER, allowNull: false },
  previous_value: { type: DataTypes.JSON, allowNull: true },
  new_value:      { type: DataTypes.JSON, allowNull: true },
  ip_address:     { type: DataTypes.STRING(45), allowNull: true },
}, {
  sequelize,
  tableName: 'audit_logs',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: false,
});

export default AuditLog;