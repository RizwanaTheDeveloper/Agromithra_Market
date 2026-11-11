import { Redirect } from 'expo-router';

// The Home/Profile preview opens without a sign-in flow.
export default function AuthLayout() { return <Redirect href="/(tabs)" />; }
