import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

export interface WorkLogAttributes {
  id: number;
  task_id: number;
  user_id: number;
  description: string;
  hours_worked: number;
  attachment_url?: string | null;
  created_at?: Date;
}
interface WorkLogCreationAttributes extends Optional<WorkLogAttributes, 'id'> {}

class WorkLog extends Model<WorkLogAttributes, WorkLogCreationAttributes> implements WorkLogAttributes {
  public id!: number;
  public task_id!: number;
  public user_id!: number;
  public description!: string;
  public hours_worked!: number;
  public attachment_url!: string | null;
  public readonly created_at!: Date;
}

WorkLog.init({
  id:             { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  task_id:        { type: DataTypes.INTEGER, allowNull: false },
  user_id:        { type: DataTypes.INTEGER, allowNull: false },
  description:    { type: DataTypes.TEXT, allowNull: false },
  hours_worked:   {
    type: DataTypes.DECIMAL(4,2), allowNull: false,
    validate: { min: 0.1, max: 24 },
  },
  attachment_url: { type: DataTypes.STRING(500), allowNull: true },
}, {
  sequelize,
  tableName: 'work_logs',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: false,
});

export default WorkLog;