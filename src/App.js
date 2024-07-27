import React, { Component } from "react";
import { ExpenseList, ExpenseForm, LoadingBar } from "./components/index";
import { MDCSnackbar } from "@material/snackbar/dist/mdc.snackbar.js";
import { parseExpense, append, update } from './components/expenses';

import "@material/fab/dist/mdc.fab.css";
import "@material/button/dist/mdc.button.css";
import "@material/toolbar/dist/mdc.toolbar.css";
import "@material/snackbar/dist/mdc.snackbar.css";
import "@material/card/dist/mdc.card.css";

import "./App.css";

class App extends Component {

  // =================== Initialization ===================

  constructor() {
    super();

    this.clientId =
      "624739709049-hsbpgrimevikffkbaeeclqneflib7b7o.apps.googleusercontent.com";
    this.spreadsheetId =
      process.env.REACT_APP_SHEET_ID ||
      "199goDfe-uggNp1LfZpIQc48t4uLu04nFvQzLgPWjPM4";

    this.state = {
      signedIn: undefined,
      accounts: [],
      categories: [],
      expenses: [],
      processing: true,
      expense: {},
      currentMonth: undefined,
      previousMonth: undefined,
      showExpenseForm: false
    };

  }

  componentDidMount() {
    this.loadGisClient();
    this.loadGapiClient();
    document.addEventListener("keyup", this.onKeyPressed.bind(this));
  }

  // =================== Rendering ===================

  render() {
    return (
        <div>
          <header className="mdc-toolbar mdc-toolbar--fixed">
            <div className="mdc-toolbar__row">
              <section className="mdc-toolbar__section mdc-toolbar__section--align-start">
                <span className="mdc-toolbar__title">Expenses</span>
              </section>
              <section
                  className="mdc-toolbar__section mdc-toolbar__section--align-end"
                  role="toolbar"
              >
                {this.state.signedIn === false &&
                    <a
                        className="material-icons mdc-toolbar__icon"
                        aria-label="Sign in"
                        alt="Sign in"
                        onClick={this.signIn}
                    >
                      perm_identity
                    </a>}
                {this.state.signedIn &&
                    <a
                        className="material-icons mdc-toolbar__icon"
                        aria-label="Sign out"
                        alt="Sign out"
                        onClick={this.signOut}
                    >
                      exit_to_app
                    </a>}
              </section>
            </div>
          </header>
          <div className="toolbar-adjusted-content">
            {this.state.signedIn === undefined && <LoadingBar/>}
            {this.state.signedIn === false &&
                <div className="center">
                  <button
                      className="mdc-button sign-in"
                      aria-label="Sign in"
                      onClick={() => {
                        this.signIn();
                      }}
                  >
                    Sign In
                  </button>
                </div>}
            {this.state.signedIn && this.renderBody()}
          </div>
          <div
              ref={el => {
                if (el) {
                  this.snackbar = new MDCSnackbar(el);
                }
              }}
              className="mdc-snackbar"
              aria-live="assertive"
              aria-atomic="true"
              aria-hidden="true"
          >
            <div className="mdc-snackbar__text"/>
            <div className="mdc-snackbar__action-wrapper">
              <button
                  type="button"
                  className="mdc-button mdc-snackbar__action-button"
                  aria-hidden="true"
              />
            </div>
          </div>
        </div>
    );
  }

  renderBody() {
    if (this.state.processing) return <LoadingBar/>;
    else
      return (
          <div className="content">
            {this.renderExpenses()}
          </div>
      );
  }

  renderExpenses() {
    if (this.state.showExpenseForm)
      return (
          <ExpenseForm
              categories={this.state.categories}
              accounts={this.state.accounts}
              expense={this.state.expense}
              onSubmit={this.handleExpenseSubmit}
              onCancel={this.handleExpenseCancel}
              onDelete={this.handleExpenseDelete}
              onChange={this.handleExpenseChange}
          />
      );
    else
      return (
          <div>
            <div className="mdc-card">
              <section className="mdc-card__primary">
                <h2 className="mdc-card__subtitle">This month you've spent:</h2>
                <h1 className="mdc-card__title mdc-card__title--large center">
                  {this.state.currentMonth}
                </h1>
              </section>
              <section className="mdc-card__supporting-text">
                Previous month: {this.state.previousMonth}
              </section>
            </div>
            <ExpenseList
                expenses={this.state.expenses}
                onSelect={this.handleExpenseSelect}
            />
            <button
                onClick={() => this.onExpenseNew()}
                className="mdc-fab app-fab--absolute material-icons"
                aria-label="Add expense"
            >
              <span className="mdc-fab__icon">add</span>
            </button>
          </div>
      );
  }

  // =================== Business logic ===================

  onKeyPressed = (e) => {
    if (this.state.signedIn === true) {
      if (this.state.showExpenseForm === false) {
        if (e.keyCode === 65) { // a
          this.onExpenseNew()
        }
      } else {
        if (e.keyCode === 27) { // escape
          this.handleExpenseCancel()
        }
      }
    }
  }

  handleExpenseSubmit = () => {
    this.setState({ processing: true, showExpenseForm: false });
    const submitAction = (this.state.expense.id ? update : append).bind(this);
    submitAction(this.state.expense, this.spreadsheetId).then(
      response => {
        this.snackbar.show({
          message: `Expense ${this.state.expense.id ? "updated" : "added"}!`
        });
        this.loadFromGSheet();
      },
      response => {
        console.error("Something went wrong");
        console.error(response);
        this.setState({ loading: false });
      }
    );
  }

  handleExpenseChange = (attribute, value) => {
    this.setState({
      expense: Object.assign({}, this.state.expense, { [attribute]: value })
    });
  }

  handleExpenseDelete = (expense) => {
    this.setState({ processing: true, showExpenseForm: false });
    const expenseRow = expense.id.substring(10);
    window.gapi.client.sheets.spreadsheets
      .batchUpdate({
        spreadsheetId: this.spreadsheetId,
        resource: {
          requests: [
            {
              deleteDimension: {
                range: {
                  sheetId: 0,
                  dimension: "ROWS",
                  startIndex: expenseRow - 1,
                  endIndex: expenseRow
                }
              }
            }
          ]
        }
      })
      .then(
        response => {
          this.snackbar.show({ message: "Expense deleted!" });
          this.loadFromGSheet();
        },
        response => {
          console.error("Something went wrong");
          console.error(response);
          this.setState({ loading: false });
        }
      );
  }

  handleExpenseSelect = (expense) => {
    this.setState({ expense: expense, showExpenseForm: true });
  }

  handleExpenseCancel = () => {
    this.setState({ showExpenseForm: false });
  }

  onExpenseNew() {
    const now = new Date();
    this.setState({
      showExpenseForm: true,
      expense: {
        amount: "",
        description: "",
        date: `${now.getFullYear()}-${now.getMonth() < 9
          ? "0" + (now.getMonth() + 1)
          : now.getMonth() + 1}-${now.getDate() < 10
          ? "0" + now.getDate()
          : now.getDate()}`,
        category: this.state.categories[0],
        account: this.state.accounts[0]
      }
    });
  }

  loadFromGSheet() {
    window.gapi.client.sheets.spreadsheets.values
      .batchGet({
        spreadsheetId: this.spreadsheetId,
        ranges: [
          "Data!A2:A50",
          "Data!E2:E50",
          "Expenses!A2:F",
          "Current!H1",
          "Previous!H1"
        ]
      })
      .then(response => {
        const accounts = response.result.valueRanges[0].values.map(
          items => items[0]
        );
        const categories = response.result.valueRanges[1].values.map(
          items => items[0]
        );
        this.setState({
          accounts: accounts,
          categories: categories,
          expenses: (response.result.valueRanges[2].values || [])
            .map(parseExpense)
            .sort((e1, e2) => (new Date(e1.date) - new Date(e2.date)))
            .reverse()
            .slice(0, 30),
          processing: false,
          currentMonth: response.result.valueRanges[3].values[0][0],
          previousMonth: response.result.valueRanges[4].values[0][0]
        });
      });
  }

// =================== Google auth/api clients ===================

  loadGisClient = () => {
    const gisScript = document.createElement("script");
    gisScript.src = "https://accounts.google.com/gsi/client";
    gisScript.async = true;
    gisScript.defer = true;
    document.body.appendChild(gisScript);
  }

  loadGapiClient = () => {
    const gapiScript = document.createElement("script");
    gapiScript.src = "https://apis.google.com/js/api.js";
    gapiScript.async = true;
    gapiScript.defer = true;
    gapiScript.onload = () => {
      window.gapi.load('client', this.initializeClients);
    };
    document.body.appendChild(gapiScript);
  }

  initializeClients = () => {
    this.initializeGisClient();
    this.initializeGapiClient();
  }

  initializeGisClient = () => {
    if (window.google && window.google.accounts && window.google.accounts.oauth2) {
      this.tokenClient = window.google.accounts.oauth2.initTokenClient({
        client_id: this.clientId,
        scope: "https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/drive.metadata.readonly",
        callback: this.handleCredentialResponse,
      });
      this.checkSignInStatus();
    } else {
      console.error('Google Identity Services failed to load');
    }
  }

  initializeGapiClient = () => {
    window.gapi.client.init({
      discoveryDocs: ["https://sheets.googleapis.com/$discovery/rest?version=v4"],
    }).then(() => {
      this.checkSignInStatus();
    }).catch(err => console.error('Error initializing Google API client:', err));
  }

  handleCredentialResponse = (response) => {
    if (response && response.access_token) {
      window.gapi.client.setToken({access_token: response.access_token});
      this.setState({ signedIn: true });
      this.loadFromGSheet();
    }
  }

  checkSignInStatus = () => {
    const token = window.gapi.client.getToken();
    if (token && token.access_token) {
      this.setState({ signedIn: true });
      this.loadFromGSheet();
    } else {
      this.setState({ signedIn: false });
    }
  }

  signIn = () => {
    this.tokenClient.requestAccessToken({ prompt: 'consent' });
  }

  signOut = () => {
    const token = window.gapi.client.getToken();
    if (token !== null) {
      window.google.accounts.oauth2.revoke(token.access_token, () => {
        window.gapi.client.setToken('');
        this.setState({ signedIn: false });
      });
    }
  }
}

export default App;
