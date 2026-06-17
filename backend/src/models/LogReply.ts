import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

export interface LogReplyAttributes {
  id: number;
  log_id: number;
  user_id: number;
  message: string;
  created_at?: Date;
}
interface LogReplyCreationAttributes extends Optional<LogReplyAttributes, 'id'> {}

class LogReply extends Model<LogReplyAttributes, LogReplyCreationAttributes> implements LogReplyAttributes {
  public id!: number;
  public log_id!: number;
  public user_id!: number;
  public message!: string;
  public readonly created_at!: Date;
}

LogReply.init({
  id:      { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  log_id:  { type: DataTypes.INTEGER, allowNull: false },
  user_id: { type: DataTypes.INTEGER, allowNull: false },
  message: { type: DataTypes.TEXT, allowNull: false },
}, {
  sequelize,
  tableName: 'log_replies',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: false,
});

export default LogReply;