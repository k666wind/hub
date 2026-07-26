import { Redirect, Route } from 'react-router-dom';
import {
  IonApp,
  IonIcon,
  IonLabel,
  IonRouterOutlet,
  IonTabBar,
  IonTabButton,
  IonTabs,
  setupIonicReact,
} from '@ionic/react';
import { IonReactRouter } from '@ionic/react-router';
import { homeOutline, timeOutline, statsChartOutline, settingsOutline } from 'ionicons/icons';

import { ThemeProvider } from './components/ThemeProvider';
import HomePage from './pages/HomePage';
import HistoryPage from './pages/HistoryPage';
import StatisticsPage from './pages/StatisticsPage';
import SettingsPage from './pages/SettingsPage';

/* Core Ionic CSS */
import '@ionic/react/css/core.css';
import '@ionic/react/css/normalize.css';
import '@ionic/react/css/structure.css';
import '@ionic/react/css/typography.css';

/* Project theme (mahjong tile / felt tokens) — loaded after Ionic core so it wins */
import './theme.css';
import './App.css';

setupIonicReact({ mode: 'md' });

export default function App() {
  return (
    <ThemeProvider>
      <IonApp>
        <IonReactRouter basename={import.meta.env.BASE_URL}>
          <IonTabs>
            <IonRouterOutlet>
              <Route exact path="/home" component={HomePage} />
              <Route exact path="/history" component={HistoryPage} />
              <Route exact path="/statistics" component={StatisticsPage} />
              <Route exact path="/settings" component={SettingsPage} />
              <Route exact path="/">
                <Redirect to="/home" />
              </Route>
            </IonRouterOutlet>

            <IonTabBar slot="bottom" className="mj-tabbar">
              <IonTabButton tab="home" href="/home">
                <IonIcon icon={homeOutline} />
                <IonLabel>牌局</IonLabel>
              </IonTabButton>
              <IonTabButton tab="history" href="/history">
                <IonIcon icon={timeOutline} />
                <IonLabel>紀錄</IonLabel>
              </IonTabButton>
              <IonTabButton tab="statistics" href="/statistics">
                <IonIcon icon={statsChartOutline} />
                <IonLabel>統計</IonLabel>
              </IonTabButton>
              <IonTabButton tab="settings" href="/settings">
                <IonIcon icon={settingsOutline} />
                <IonLabel>設定</IonLabel>
              </IonTabButton>
            </IonTabBar>
          </IonTabs>
        </IonReactRouter>
      </IonApp>
    </ThemeProvider>
  );
}
