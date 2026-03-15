// src/i18n/en.ts
export const en = {
  translation: {
    // App
    app_name: 'Hattira',
    loading: 'Loading...',
    error: 'Something went wrong',
    retry: 'Retry',
    cancel: 'Cancel',
    save: 'Save',
    done: 'Done',
    ok: 'OK',
    yes: 'Yes',
    no: 'No',
    delete: 'Delete',
    confirm: 'Confirm',

    // Auth
    auth: {
      login: 'Login',
      signup: 'Sign Up',
      logout: 'Logout',
      email: 'Email',
      password: 'Password',
      full_name: 'Full Name',
      email_placeholder: 'Enter your email',
      password_placeholder: 'Enter your password',
      name_placeholder: 'Enter your full name',
      no_account: "Don't have an account? Sign Up",
      have_account: 'Already have an account? Login',
      login_error: 'Invalid email or password',
      signup_error: 'Could not create account',
      logout_confirm: 'Are you sure you want to logout?',
    },

    // Profile
    profile: {
      title: 'Profile',
      edit: 'Edit Profile',
      bio: 'Bio',
      bio_placeholder: 'Tell people about yourself...',
      online: 'Online',
      offline: 'Offline',
      last_active: 'Last active {{time}}',
      change_photo: 'Change Photo',
      save_changes: 'Save Changes',
      username: 'Username',
      username_placeholder: 'Choose a username',
    },

    // GPS / Online
    gps: {
      go_online: 'Go Online',
      go_offline: 'Go Offline',
      online_status: 'You are online',
      offline_status: 'You are offline',
      location_permission_denied: 'Location permission is required to go online',
      enable_location: 'Enable Location',
    },

    // Nearby
    nearby: {
      title: 'Nearby',
      radius: 'Radius',
      km: 'km',
      no_users: 'No one nearby right now',
      no_users_subtitle: 'Try increasing the radius or check back later',
      refresh: 'Refresh',
      away: '{{distance}} km away',
      connect: 'Connect',
      request_sent: 'Request Sent',
    },

    // Matching
    matches: {
      title: 'Matches',
      pending_requests: 'Pending Requests',
      your_matches: 'Your Matches',
      no_matches: 'No matches yet',
      no_matches_subtitle: 'Connect with nearby people to start chatting',
      accept: 'Accept',
      reject: 'Reject',
      match_accepted: '🎉 You are now matched!',
      request_sent: 'Connection request sent!',
    },

    // Chat
    chat: {
      title: 'Messages',
      type_message: 'Type a message...',
      send: 'Send',
      typing: 'typing...',
      seen: 'Seen',
      no_chats: 'No conversations yet',
      no_chats_subtitle: 'Accept connections to start chatting',
      today: 'Today',
      yesterday: 'Yesterday',
    },

    // Settings
    settings: {
      title: 'Settings',
      language: 'Language',
      notifications: 'Notifications',
      privacy: 'Privacy',
      show_distance: 'Show distance to others',
      discoverable: 'Make me discoverable',
      english: 'English',
      kannada: 'ಕನ್ನಡ',
      notifications_enabled: 'Enable notifications',
      about: 'About Hattira',
      version: 'Version {{version}}',
      privacy_policy: 'Privacy Policy',
    },

    // Errors
    errors: {
      network: 'Network error. Check your connection.',
      location: 'Could not get your location',
      upload_failed: 'Upload failed. Try again.',
      message_failed: 'Could not send message',
    },
  },
};