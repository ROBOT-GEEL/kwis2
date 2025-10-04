import rclpy
from rclpy.node import Node
from sensor_msgs.msg import LaserScan
from geometry_msgs.msg import Twist

class EmergencyStopNode(Node):
    def __init__(self):
        super().__init__('emergency_stop_node')
        
        # Emergency stop threshold (meters)
        self.threshold = 0.6  # Stop if object is closer than 0.5 meters

        # Subscriber to LiDAR data
        self.lidar_sub = self.create_subscription(
            LaserScan,
            '/scan',  # LiDAR topic name (you may need to change this depending on your robot)
            self.lidar_callback,
            10  # QoS History depth
        )
        
        # Publisher for emergency stop command
        self.cmd_vel_pub = self.create_publisher(Twist, '/cmd_vel', 10)

    def lidar_callback(self, msg):
        # Check if there is an object closer than the threshold
        min_distance = min(msg.ranges)  # Get minimum range value from the LiDAR scan

        if min_distance < self.threshold:
            self.get_logger().warn(f"Emergency! Object too close: {min_distance:.2f}m")
            self.emergency_stop()
        else:
            self.get_logger().info(f"Safe distance: {min_distance:.2f}m")

    def emergency_stop(self):
        # Stop the robot by publishing zero velocity
        stop_msg = Twist()
        self.cmd_vel_pub.publish(stop_msg)
        self.get_logger().info("Emergency stop triggered! Robot stopped.")

def main(args=None):
    rclpy.init(args=args)
    node = EmergencyStopNode()

    try:
        rclpy.spin(node)
    except KeyboardInterrupt:
        pass
    finally:
        node.destroy_node()
        rclpy.shutdown()

if __name__ == '__main__':
    main()