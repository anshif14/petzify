# Petzify Admin Panel: Role-Based Access Control

This document explains the role-based access control system implemented in the Petzify admin panel. It outlines how to manage users with different roles and permissions.

## Role Hierarchy

The Petzify admin panel supports multiple user roles with different access levels:

1. **Super Admin** - Has full access to all features and can manage other admin users
2. **Admin** - Has access to most features except user management
3. **Editor** - Can edit content but has limited access to other features
4. **Doctor** - Special role for veterinary professionals with specific permissions
5. **Assistant** - Support role with limited access
6. **Moderator** - Can moderate content but has limited administrative access
7. **Custom** - Any custom role you define with specific permissions

## Default Permissions by Role

| Role | Edit Contacts | Manage Messages | Manage Users | Edit Profile |
|------|---------------|-----------------|--------------|--------------|
| Super Admin | ✅ | ✅ | ✅ | ✅ |
| Admin | ✅ | ✅ | ❌ | ✅ |
| Editor | ✅ | ❌ | ❌ | ❌ |
| Doctor | ❌ | ✅ | ❌ | ✅ |
| Assistant | ❌ | ✅ | ❌ | ❌ |
| Moderator | ❌ | ✅ | ❌ | ❌ |
| Custom | Customizable | Customizable | Customizable | Customizable |

## Permission Details

1. **Edit Contacts** - Allows editing of contact information displayed on the website
2. **Manage Messages** - Allows viewing and responding to messages from website visitors
3. **Manage Users** - Allows creating, editing, and deleting admin users
4. **Edit Profile** - Allows editing of the user's own profile information

## Setting Up the First Admin User

When you first set up the Petzify admin panel, you'll need to create a Super Admin user:

1. Navigate to `/admin/setup` in your browser
2. Fill in the required information for the Super Admin
3. The default username will be set to "superadmin"
4. Create a strong password
5. After successful creation, you'll be redirected to the login page

## Adding New Admin Users

Only Super Admins and users with the "Manage Users" permission can add new admin users:

1. Log in as a Super Admin or a user with the "Manage Users" permission
2. Go to the "User Management" tab in the admin dashboard
3. Click "Add New User" and fill in the required information
4. Select a role for the new user
5. If selecting "Custom", enter a custom role name
6. Configure specific permissions for the user
7. Click "Add User" to create the new admin user

## Editing User Permissions

To edit an existing user's permissions:

1. Log in as a Super Admin or a user with the "Manage Users" permission
2. Go to the "User Management" tab
3. Find the user you want to edit and click "Edit"
4. Update the user's information, role, or permissions
5. Click "Update User" to save the changes

## Deleting Users

To delete an admin user:

1. Log in as a Super Admin or a user with the "Manage Users" permission
2. Go to the "User Management" tab
3. Find the user you want to delete and click "Delete"
4. Confirm the deletion in the confirmation dialog

Note: You cannot delete your own user account.

## Accessing Admin Features

When a user logs in, they will only see the features they have permission to access. The sidebar menu will only display options the user is allowed to use.

## Security Considerations

1. Super Admin credentials should be kept strictly confidential
2. Regularly review admin user accounts and remove those that are no longer needed
3. Assign the minimum necessary permissions to each user
4. Periodically update passwords for all admin accounts
5. Monitor admin account activity for any suspicious behavior

## Troubleshooting

If a user reports they cannot access certain features:

1. Check their role and permissions in the User Management section
2. Ensure they are logging in with the correct credentials
3. If necessary, update their permissions or role

## Custom Roles

To create a custom role with specific permissions:

1. Add a new user or edit an existing one
2. Select "Custom" from the role dropdown
3. Enter a descriptive name for the custom role
4. Check the specific permissions you want to grant
5. Save the user

This allows you to create specialized roles for specific purposes.

## Best Practices

1. Follow the principle of least privilege - give users only the permissions they need
2. Create role-specific users rather than sharing admin credentials
3. Regularly audit user accounts and permissions
4. Document your custom roles and their intended purposes
5. Train users on their specific responsibilities and limitations

By following these guidelines, you can maintain a secure and well-organized admin panel for your Petzify website. 