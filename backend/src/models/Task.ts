import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

export type TaskPriority = 'low' | 'medium' | 'high' | 'critical';
export type TaskStatus   = 'todo' | 'in_progress' | 'in_review' | 'completed' | 'blocked';

export interface TaskAttributes {
  id: number;
  project_id: number;
  title: string;
  description?: string | null;
  priority: TaskPriority;
  status: TaskStatus;
  deadline: Date;
  assigned_to?: number | null;
  created_by: number;
  estimated_hours: number;
  deleted_at?: Date | null;
  created_at?: Date;
  updated_at?: Date;
}
interface TaskCreationAttributes extends Optional<TaskAttributes, 'id' | 'priority' | 'status' | 'estimated_hours'> {}

class Task extends Model<TaskAttributes, TaskCreationAttributes> implements TaskAttributes {
  public id!: number;
  public project_id!: number;
  public title!: string;
  public description!: string | null;
  public priority!: TaskPriority;
  public status!: TaskStatus;
  public deadline!: Date;
  public assigned_to!: number | null;
  public created_by!: number;
  public estimated_hours!: number;
  public deleted_at!: Date | null;
  public readonly created_at!: Date;
  public readonly updated_at!: Date;
}

Task.init({
  id:              { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  project_id:      { type: DataTypes.INTEGER, allowNull: false },
  title:           { type: DataTypes.STRING(200), allowNull: false },
  description:     { type: DataTypes.TEXT, allowNull: true },
  priority:        { type: DataTypes.ENUM('low','medium','high','critical'), defaultValue: 'medium' },
  status:          { type: DataTypes.ENUM('todo','in_progress','in_review','completed','blocked'), defaultValue: 'todo' },
  deadline:        { type: DataTypes.DATE, allowNull: false },
  assigned_to:     { type: DataTypes.INTEGER, allowNull: true },
  created_by:      { type: DataTypes.INTEGER, allowNull: false },
  estimated_hours: { type: DataTypes.DECIMAL(5,2), defaultValue: 0 },
  deleted_at:      { type: DataTypes.DATE, allowNull: true },
}, {
  sequelize,
  tableName: 'tasks',
  paranoid: true,
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  deletedAt: 'deleted_at',
});

export default Task;