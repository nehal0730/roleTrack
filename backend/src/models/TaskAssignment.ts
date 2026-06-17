import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

export interface TaskAssignmentAttributes {
  id: number;
  task_id: number;
  assigned_to: number;
  assigned_by: number;
  assigned_at?: Date;
  unassigned_at?: Date | null;
  notes?: string | null;
}

interface TaskAssignmentCreationAttributes
  extends Optional<TaskAssignmentAttributes, 'id' | 'unassigned_at' | 'notes'> {}

class TaskAssignment
  extends Model<TaskAssignmentAttributes, TaskAssignmentCreationAttributes>
  implements TaskAssignmentAttributes
{
  public id!: number;
  public task_id!: number;
  public assigned_to!: number;
  public assigned_by!: number;
  public assigned_at!: Date;
  public unassigned_at!: Date | null;
  public notes!: string | null;
}

TaskAssignment.init(
  {
    id:            { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    task_id:       { type: DataTypes.INTEGER, allowNull: false },
    assigned_to:   { type: DataTypes.INTEGER, allowNull: false },
    assigned_by:   { type: DataTypes.INTEGER, allowNull: false },
    assigned_at:   { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    unassigned_at: { type: DataTypes.DATE, allowNull: true },
    notes:         { type: DataTypes.STRING(500), allowNull: true },
  },
  {
    sequelize,
    tableName: 'task_assignments',
    timestamps: false,
  }
);

export default TaskAssignment;