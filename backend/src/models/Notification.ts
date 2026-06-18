import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

export type NotificationType =
  | 'deadline_48h' | 'deadline_24h' | 'deadline_12h' | 'deadline_1h'
  | 'overdue' | 'assignment' | 'reply';

export interface NotificationAttributes {
  id: number;
  user_id: number;
  task_id?: number | null;
  type: NotificationType;
  message: string;
  is_read: boolean;
  sent_at?: Date | null;
  created_at?: Date;
}
interface NotificationCreationAttributes
  extends Optional<NotificationAttributes, 'id' | 'is_read'> {}

class Notification
  extends Model<NotificationAttributes, NotificationCreationAttributes>
  implements NotificationAttributes {
  public id!: number;
  public user_id!: number;
  public task_id!: number | null;
  public type!: NotificationType;
  public message!: string;
  public is_read!: boolean;
  public sent_at!: Date | null;
  public readonly created_at!: Date;
}

Notification.init({
  id:      { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  user_id: { type: DataTypes.INTEGER, allowNull: false },
  task_id: { type: DataTypes.INTEGER, allowNull: true },
  type:    {
    type: DataTypes.ENUM(
      'deadline_48h','deadline_24h','deadline_12h','deadline_1h',
      'overdue','assignment','reply'
    ),
    allowNull: false,
  },
  message: { type: DataTypes.TEXT, allowNull: false },
  is_read: { type: DataTypes.BOOLEAN, defaultValue: false },
  sent_at: { type: DataTypes.DATE, allowNull: true },
}, {
  sequelize,
  tableName:  'notifications',
  timestamps: true,
  createdAt:  'created_at',
  updatedAt:  false,
  indexes: [
    { fields: ['user_id'] },
    { fields: ['task_id'] },
    { fields: ['is_read'] },
    { fields: ['task_id', 'type'], name: 'idx_notif_task_type' },
  ],
});

export default Notification;