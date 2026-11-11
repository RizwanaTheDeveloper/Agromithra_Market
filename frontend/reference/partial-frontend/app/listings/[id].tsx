import { View, Text } from "react-native";
import { useLocalSearchParams } from "expo-router";
export default function ListingDetail() {
 const { id } = useLocalSearchParams<{ id: string }>();
 return <View style={{flex:1,padding:24}}><Text>Listing: {id}</Text></View>;
}
