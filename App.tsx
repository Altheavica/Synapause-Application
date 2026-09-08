import React, {useEffect} from "react";
import {AppState,} from "react-native";
import AppNavigator from './src/navigation/AppNavigator';
import DetectorService from "./src/services/DetectorService";
import {ThemeProvider} from "./src/theme/ThemeContext";

function AppContent() {
  useEffect(() => {
      const subscription =
          AppState.addEventListener(
              "change",
              state => {

                  if(
                      state ===
                      "active"
                  ){
                      DetectorService
                          .resumePendingStart();
                  }
              }
          );


      return () => {

          subscription.remove();
      };

  }, []);

  return(
      <AppNavigator />
  );
}

export default function App(){
  return(
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
}
