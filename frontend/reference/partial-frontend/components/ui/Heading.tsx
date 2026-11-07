import { Text, StyleSheet } from 'react-native';
export function Heading({ title, subtitle }: {title: string; subtitle?: string}) {
 return <><Text style={styles.title}>{title}</Text>{subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}</>;
}
const styles = StyleSheet.create({title:{fontSize:26,fontWeight:'700',color:'#174C2A'},subtitle:{fontSize:15,color:'#4F6658'}});
