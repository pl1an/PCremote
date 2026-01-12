import { NavigationContainer } from "@react-navigation/native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import RootLayout from "./_layout";
import { TcpProvider } from "./contexts/tcpContext";
import { SecureKeyProvider } from "./contexts/secureKeyContext";


export default function Index() {

    return (
        <SafeAreaProvider>
            <TcpProvider>
                <SecureKeyProvider>
                    <NavigationContainer>
                        <RootLayout />
                    </NavigationContainer>
                </SecureKeyProvider>
            </TcpProvider>
        </SafeAreaProvider>
    )
}