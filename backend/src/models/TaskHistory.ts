import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

export interface TaskHistoryAttributes {
  id: number;
  task_id: number;
  changed_by: number;
  field: string;
  old_value: string | null;
  new_value: string | null;
  created_at?: Date;
}
interface TaskHistoryCreationAttributes extends Optional<TaskHistoryAttributes, 'id'> {}

class TaskHistory extends Model<TaskHistoryAttributes, TaskHistoryCreationAttributes>
  implements TaskHistoryAttributes {
  public id!: number;
  public task_id!: number;
  public changed_by!: number;
  public field!: string;
  public old_value!: string | null;
  public new_value!: string | null;
  public readonly created_at!: Date;
}

TaskHistory.init({
  id:         { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  task_id:    { type: DataTypes.INTEGER, allowNull: false },
  changed_by: { type: DataTypes.INTEGER, allowNull: false },
  field:      { type: DataTypes.STRING(50), allowNull: false },
  old_value:  { type: DataTypes.STRING(255), allowNull: true },
  new_value:  { type: DataTypes.STRING(255), allowNull: true },
}, {
  sequelize,
  tableName: 'task_history',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: false,
});

export default TaskHistory;