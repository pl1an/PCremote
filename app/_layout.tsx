import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StyleSheet } from "react-native";
import { themes } from "./styles/themes";


export type RootStackParamList = {
    default: undefined;
}

const Stack = createNativeStackNavigator<RootStackParamList>();


export default function RootLayout() {

    const insets = useSafeAreaInsets();
    const style_sheet = StyleSheet.create({
        container:{
            width:"100%",
            height:"100%",
            paddingTop: insets.top,
            paddingBottom: insets.bottom,
            paddingLeft: Math.max(insets.left, 16),
            paddingRight: Math.max(insets.right, 16),
            backgroundColor: themes["default"].background
        }
    });
    

    return (
        <Stack.Navigator 
            initialRouteName="default"
            screenOptions={{
                headerShown:false,
                presentation: 'transparentModal',
                contentStyle: style_sheet.container
            }}
        >
            <Stack.Screen name="default" component={require("./pages/default").Default} />
        </Stack.Navigator>
    );
}
