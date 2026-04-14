function wire(skipLocalStorageLoading = false) {
    // Load persisted state from localStorage if available (unless we loaded from URL)
    if (!skipLocalStorageLoading) {
      try {
        const saved = localStorage.getItem('profitpath-state');
        if (saved) {
          const parsed = JSON.parse(saved);
          // Merge saved state with defaults to handle new fields gracefully
          state.mode = parsed.mode ?? state.mode;
          state.offerings = parsed.offerings ?? state.offerings;
          state.employees = parsed.employees ?? state.employees;
          state.employeePay = parsed.employeePay ?? state.employeePay;
          state.monthlyCosts = parsed.monthlyCosts ?? state.monthlyCosts;
          state.productiveUtilizationPct = parsed.productiveUtilizationPct ?? state.productiveUtilizationPct;
          state.targetUtilizationPct = parsed.targetUtilizationPct ?? state.targetUtilizationPct;
          state.lockMix = parsed.lockMix ?? state.lockMix;

          // Validate loaded data and sanitize if needed
          validateAndSanitizeLoadedState();
        }
      } catch (e) {
        console.warn('Failed to load saved state:', e);
      }
    }

    // migrate existing save calls to global persistState
    $('#modeSelect').addEventListener('change', () => {
      setStateFromInputs();
      persistState();
      render();
    });

    $('#lockMix')?.addEventListener('change', () => {
      setStateFromInputs();

      // If enabling the lock, immediately rebalance without changing relative weights.
      if (state.mode === 'forecast' && state.lockMix) {
        const sum = state.offerings.reduce((a, o) => a + (Number(o.mixPct) || 0), 0);
        if (sum > 0) {
          state.offerings.forEach((o) => (o.mixPct = ((Number(o.mixPct) || 0) / sum) * 100));
        }
      }

      persistState();
      render();
    });

    $$('#controls input').forEach((el) => {
      el.addEventListener('input', () => {
        setStateFromInputs();
        persistState();
        render();
      });
    });

    $('#addOfferingBtn').addEventListener('click', addOffering);
    $('#resetBtn').addEventListener('click', resetDefaults);

    // Templates dropdown functionality
    const templatesBtn = $('#templatesBtn');
    if (templatesBtn) {
      templatesBtn.addEventListener('click', (e) => {
        e.preventDefault();
        const dropdown = templatesBtn.closest('.templates-dropdown');
        const menu = $('#templatesMenu');
        if (!dropdown || !menu) return;

        // If this menu is already active, just close it
        if (menu.style.display === 'block') {
          menu.style.display = 'none';
        } else {
          // Close other dropdowns and open this one
          closeAllDropdowns();
          menu.style.display = 'block';
        }
      });
    }

    // Function to refresh desktop settings dropdown with current values
    function refreshDesktopSettings() {
      try {
        const settings = loadSettings ? loadSettings() : {};

        // Update experience level radios
        const experienceRadios = document.querySelectorAll('input[name="experienceLevel"]');
        experienceRadios.forEach(radio => {
          radio.checked = radio.value === settings.experienceLevel;
        });

        // Update feature checkboxes
        const checkboxes = document.querySelectorAll('#settingsMenu input[type="checkbox"]');
        checkboxes.forEach(checkbox => {
          const settingKey = checkbox.id;
          checkbox.checked = settings[settingKey];
        });
      } catch (error) {
        console.warn('Error refreshing desktop settings:', error);
      }
    }

    // Global settings change listener-refresh desktop settings when any setting changes
    window.addEventListener('settingsChanged', () => {
      setTimeout(refreshDesktopSettings, 10); // Small delay to ensure settings are saved
    });

    // Initialize desktop settings on page load
    setTimeout(refreshDesktopSettings, 100);

    // Desktop Settings Cog Button
    const settingsCogBtn = $('#settingsCogBtn');
    if (settingsCogBtn) {
      settingsCogBtn.addEventListener('click', (e) => {
        e.preventDefault();
        const dropdown = document.querySelector('.settings-dropdown');
        if (!dropdown) {
          console.error('Settings dropdown not found');
          return;
        }
        // If this dropdown is already active, just close it
        if (dropdown.classList.contains('active')) {
          dropdown.classList.remove('active');
        } else {
          // Close other dropdowns and open this one
          closeAllDropdowns();
          // Refresh settings values before showing
          refreshDesktopSettings();

          // Position the menu directly under the cog button
          const menu = dropdown.querySelector('.settings-menu');
          if (menu) {
            const buttonRect = settingsCogBtn.getBoundingClientRect();
            const menuWidth = 320; // max-width from CSS
            const viewportWidth = window.innerWidth;

            menu.style.position = 'fixed';
            menu.style.top = (buttonRect.bottom + 4) + 'px';

            // Calculate left position, ensuring menu stays on screen
            let leftPos = buttonRect.left + buttonRect.width / 2;
            const menuHalfWidth = menuWidth / 2;

            // If centering would put menu off left edge
            if (leftPos - menuHalfWidth < 10) {
              leftPos = menuHalfWidth + 10;
            }
            // If centering would put menu off right edge
            else if (leftPos + menuHalfWidth > viewportWidth - 10) {
              leftPos = viewportWidth - menuHalfWidth - 10;
            }

            menu.style.left = leftPos + 'px';
            menu.style.transform = 'translateX(-50%)';
            menu.style.right = 'auto';
          }

          dropdown.classList.add('active');
        }
      });
    }


    // Helper function to close all dropdowns
    function closeAllDropdowns() {
      // Close all types of dropdowns
      document.querySelectorAll('.dropdown').forEach(d => d.classList.remove('active'));
      document.querySelectorAll('.settings-dropdown').forEach(d => d.classList.remove('active'));
      document.querySelectorAll('.templates-dropdown').forEach(d => d.classList.remove('active'));
      document.querySelectorAll('.export-dropdown').forEach(d => d.classList.remove('active'));
      // Also close templates and export menus
      const templatesMenu = $('#templatesMenu');
      if (templatesMenu) {
        templatesMenu.style.display = 'none';
      }
      const exportMenu = $('#exportMenu');
      if (exportMenu) {
        exportMenu.style.display = 'none';
      }
    }

    // Settings management
    function initializeSettings() {
      const settings = loadSettings();

      // Set experience level radio buttons
      const experienceRadios = document.querySelectorAll('input[name="experienceLevel"]');
      experienceRadios.forEach(radio => {
        radio.checked = radio.value === settings.experienceLevel;
        radio.addEventListener('change', (e) => {
          setExperienceLevel(e.target.value);
          initializeSettings(); // Reinitialize to apply new settings
          updateUIForSettings();
        });
      });

      // Set feature toggles
      const checkboxes = [
        'showAdvancedCalculations',
        'showDetailedBreakdown',
        'showComparisonTools',
        'showExportOptions',
        'showDebugPanel',
        'compactMode',
        'showTooltips'
      ];

      checkboxes.forEach(key => {
        const checkbox = $('#' + key);
        if (checkbox) {
          checkbox.checked = settings[key];
          checkbox.addEventListener('change', (e) => {
            updateSetting(key, e.target.checked);
            updateUIForSettings();
          });
        }
      });
    }

    function updateUIForSettings() {
      const settings = loadSettings();

      // Show/hide elements based on feature gates
      const elementsToToggle = [
        { selector: '.advanced-calculations', setting: 'showAdvancedCalculations' },
        { selector: '.detailed-breakdown', setting: 'showDetailedBreakdown' },
        { selector: '.comparison-tools', setting: 'showComparisonTools' },
        { selector: '.export-options', setting: 'showExportOptions' },
        { selector: '.debug-panel', setting: 'showDebugPanel' }
      ];

      elementsToToggle.forEach(({ selector, setting }) => {
        const elements = document.querySelectorAll(selector);
        elements.forEach(el => {
          el.style.display = settings[setting] ? 'block' : 'none';
        });
      });

      // Apply compact mode
      document.body.classList.toggle('compact-mode', settings.compactMode);

      // Update tooltips visibility
      // This would require additional implementation
    }

    // Initialize settings on app load
    initializeSettings();
    updateUIForSettings();

    // Template selection handlers
    document.querySelectorAll('.template-option').forEach(option => {
      option.addEventListener('click', (e) => {
        e.preventDefault();
        const template = e.target.dataset.template;
        const menu = $('#templatesMenu');
        if (menu) menu.style.display = 'none';

        // Track template usage
        if (window.profitPathAnalytics) {
          window.profitPathAnalytics.trackTemplateUsage(template, e.target.textContent.trim());
        }

        loadIndustryTemplate(template);
      });
    });

    // Export dropdown functionality
    const exportBtn = $('#exportBtn');
    if (exportBtn) {
      exportBtn.addEventListener('click', (e) => {
        e.preventDefault();
        const dropdown = exportBtn.closest('.export-dropdown');
        const menu = $('#exportMenu');
        if (!dropdown || !menu) return;

        // If this menu is already active, just close it
        if (menu.style.display === 'block') {
          menu.style.display = 'none';
        } else {
          // Close other dropdowns and open this one
          closeAllDropdowns();
          menu.style.display = 'block';
        }
      });
    }

    // Close menus when clicking outside
    document.addEventListener('click', (e) => {
      // Close templates dropdown and menu
      if (!e.target.closest('.templates-dropdown')) {
        document.querySelectorAll('.templates-dropdown').forEach(d => d.classList.remove('active'));
        const templatesMenu = $('#templatesMenu');
        if (templatesMenu) {
          templatesMenu.style.display = 'none';
        }
      }

      // Close export dropdown and menu
      if (!e.target.closest('.export-dropdown')) {
        document.querySelectorAll('.export-dropdown').forEach(d => d.classList.remove('active'));
        const exportMenu = $('#exportMenu');
        if (exportMenu) {
          exportMenu.style.display = 'none';
        }
      }

      // Close settings dropdown
      if (!e.target.closest('.settings-dropdown') && !e.target.closest('#settingsCogBtn')) {
        document.querySelectorAll('.settings-dropdown').forEach(d => d.classList.remove('active'));
      }
    });

    // Export format handlers
    document.querySelectorAll('.export-option').forEach(option => {
      option.addEventListener('click', (e) => {
        e.preventDefault();
        const format = e.target.dataset.format;
        const menu = $('#exportMenu');
        if (menu) menu.style.display = 'none';

        switch (format) {
          case 'csv':
            exportAsCSV();
            break;
          case 'excel':
            exportAsExcel();
            break;
          case 'pdf':
            exportAsPDF();
            break;
          case 'html':
            exportAsHTML();
            break;
          case 'email':
            shareViaEmail();
            break;
          case 'embed':
            showEmbedCode();
            break;
          case 'schedule':
            showScheduleDialog();
            break;
        }
      });
    });
    $('#shareBtn').addEventListener('click', shareScenario);

    // Hamburger menu
    const hamburgerBtn = $('#hamburgerBtn');
    const mobileMenuOverlay = $('#mobileMenuOverlay');
    const mobileMenuClose = $('#mobileMenuClose');
    const mobileExportBtn = $('#mobileExportBtn');
    const _mobileShareBtn = $('#mobileShareBtn');
    const _mobileScenariosBtn = $('#mobileScenariosBtn');

    // Attach mobile settings handler when menu opens
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
          if (mobileMenuOverlay.classList.contains('active')) {
            // Menu opened, attach settings handler
            setTimeout(() => {
              // Mobile Tour Button
              const mobileTourBtn = $('#mobileTourBtn');
              if (mobileTourBtn && !mobileTourBtn._handlerAttached) {
                mobileTourBtn._handlerAttached = true;
                mobileTourBtn.addEventListener('click', (e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  startGuidedTour();
                  // Close mobile menu after starting tour
                  setTimeout(() => {
                    const overlay = $('#mobileMenuOverlay');
                    const hamburger = $('#hamburgerBtn');
                    if (overlay && hamburger) {
                      overlay.classList.remove('active');
                      hamburger.classList.remove('active');
                    }
                  }, 100);
                });
              }

              const mobileSettingsBtn = $('#mobileSettingsBtn');
              if (mobileSettingsBtn && !mobileSettingsBtn._settingsHandlerAttached) {
                mobileSettingsBtn._settingsHandlerAttached = true;
                mobileSettingsBtn.addEventListener('click', (e) => {
                  e.preventDefault();
                  e.stopPropagation();

                  // Toggle inline settings section
                  const existingExperienceSection = document.querySelector('.mobile-menu .settings-section:nth-of-type(1)');
                  const existingPreferencesSection = document.querySelector('.mobile-menu .settings-section:nth-of-type(2)');

                  if (existingExperienceSection) {
                    existingExperienceSection.style.display = existingExperienceSection.style.display === 'none' ? 'block' : 'none';
                  } else {
                    const experienceSection = document.createElement('div');
                    experienceSection.className = 'settings-section';
                    experienceSection.style.cssText = 'margin-top: 12px;padding: 12px;background: rgba(255, 255, 255, 0.05);border-radius: 8px;border: 1px solid rgba(255, 255, 255, 0.1);';
                    experienceSection.innerHTML = '<div style="margin-bottom:12px;font-size:14px;font-weight:600;color:var(--text);">Experience Level</div><div style="display:flex;flex-direction:column;gap:6px;"><label style="display:flex;align-items:center;gap:8px;color:var(--text);cursor:pointer;"><input type="radio" name="mobileExperienceLevel" value="beginner" style="accent-color:#007bff;">Beginner</label><label style="display:flex;align-items:center;gap:8px;color:var(--text);cursor:pointer;"><input type="radio" name="mobileExperienceLevel" value="intermediate" style="accent-color:#007bff;">Intermediate</label><label style="display:flex;align-items:center;gap:8px;color:var(--text);cursor:pointer;"><input type="radio" name="mobileExperienceLevel" value="advanced" style="accent-color:#007bff;">Advanced</label></div>';
                    mobileSettingsBtn.parentNode.insertBefore(experienceSection, mobileSettingsBtn.nextSibling);
                  }

                  if (existingPreferencesSection) {
                    existingPreferencesSection.style.display = existingPreferencesSection.style.display === 'none' ? 'block' : 'none';
                  } else {
                    const preferencesSection = document.createElement('div');
                    preferencesSection.className = 'settings-section';
                    preferencesSection.style.cssText = 'margin-top: 12px;padding: 12px;background: rgba(255, 255, 255, 0.05);border-radius: 8px;border: 1px solid rgba(255, 255, 255, 0.1);';
                    preferencesSection.innerHTML = '<div style="margin-bottom:12px;font-size:14px;font-weight:600;color:var(--text);">Preferences</div><div style="display:flex;flex-direction:column;gap:6px;"><label style="display:flex;align-items:center;gap:8px;color:var(--text);cursor:pointer;"><input type="checkbox" id="mobileCompactMode"> Compact mode</label><label style="display:flex;align-items:center;gap:8px;color:var(--text);cursor:pointer;"><input type="checkbox" id="mobileShowTooltips"> Show tooltips</label></div>';
                    mobileSettingsBtn.parentNode.insertBefore(preferencesSection, mobileSettingsBtn.nextSibling);
                  }

                  // Initialize settings after a short delay to ensure DOM is ready
                  setTimeout(() => {
                    // Function to refresh mobile checkboxes after settings change
                    const refreshMobileCheckboxes = () => {
                      const currentSettings = loadSettings ? loadSettings() : {};
                      const mobileCheckboxes = document.querySelectorAll('.mobile-menu input[type="checkbox"]');
                      mobileCheckboxes.forEach(checkbox => {
                        const settingKey = checkbox.id.replace('mobile', '').replace(/^\w/, c => c.toLowerCase());
                        checkbox.checked = currentSettings[settingKey];
                      });
                      // Also refresh experience level radios
                      const mobileRadios = document.querySelectorAll('.mobile-menu input[name="mobileExperienceLevel"]');
                      mobileRadios.forEach(radio => {
                        radio.checked = radio.value === currentSettings.experienceLevel;
                      });
                    };

                    // Listen for global settings changes to keep mobile UI in sync
                    const handleSettingsChange = () => refreshMobileCheckboxes();
                    window.addEventListener('settingsChanged', handleSettingsChange);

                    // Store cleanup function for when menu closes
                    experienceSection._cleanupSettingsListener = () => {
                      window.removeEventListener('settingsChanged', handleSettingsChange);
                    };
                    preferencesSection._cleanupSettingsListener = () => {
                      window.removeEventListener('settingsChanged', handleSettingsChange);
                    };

                    // Initialize with current settings
                    const settings = loadSettings ? loadSettings() : {};
                    const experienceRadios = experienceSection.querySelectorAll('input[name="mobileExperienceLevel"]');
                    experienceRadios.forEach(radio => {
                      radio.checked = radio.value === settings.experienceLevel;
                      radio.addEventListener('change', (e) => {
                        if (setExperienceLevel) setExperienceLevel(e.target.value);
                        if (updateUIForSettings) updateUIForSettings();
                        // Refresh mobile checkboxes to reflect new feature gates
                        setTimeout(refreshMobileCheckboxes, 10);
                        // Desktop settings will be refreshed automatically via settingsChanged event
                      });
                    });

                    const preferencesCheckboxes = preferencesSection.querySelectorAll('input[type="checkbox"]');
                    preferencesCheckboxes.forEach(checkbox => {
                      const settingKey = checkbox.id.replace('mobile', '').replace(/^\w/, c => c.toLowerCase());
                      checkbox.checked = currentSettings[settingKey];
                      checkbox.addEventListener('change', (e) => {
                        if (updateSetting) updateSetting(settingKey, e.target.checked);
                        if (updateUIForSettings) updateUIForSettings();
                        // Desktop settings will be refreshed automatically via settingsChanged event
                      });
                    });
                  }, 10);
                  observer.observe(mobileMenuOverlay, { attributes: true, attributeFilter: ['class'] });

                  if (hamburgerBtn) {
                    hamburgerBtn.addEventListener('click', toggleMobileMenu);
                  }

                  if (mobileMenuOverlay) {
                    mobileMenuOverlay.addEventListener('click', (e) => {
                      if (e.target === mobileMenuOverlay) {
                        closeMobileMenu();
                      }
                    });
                  }

                  if (mobileMenuClose) {
                    mobileMenuClose.addEventListener('click', closeMobileMenu);
                  }

                  // Function to close all mobile submenus
                  const _closeAllMobileSubmenus = () => {
                    const submenuIds = ['mobileExportOptions', 'mobileTemplatesOptions'];
                    submenuIds.forEach(id => {
                      // Prefer getElementById for id strings, fall back to querySelector
                      const submenu = document.getElementById(id) || document.querySelector('#' + id) || document.querySelector('.' + id);
                      if (submenu) submenu.style.display = 'none';
                    });

                    // Also collapse any inline settings section inserted into the mobile menu
                    const settingsSection = document.querySelector('.mobile-menu .settings-section');
                    if (settingsSection) settingsSection.style.display = 'none';
                  };

                  if (mobileExportBtn) {
                    setTimeout(() => {
                      // This is a temporary fix for the syntax error
                    }, 100);
                  }
                });
              }
            });
          }

          // Mobile export handlers
          const mobileExportCsv = $('#mobileExportCsv');
          const mobileExportExcel = $('#mobileExportExcel');
          const mobileExportPdf = $('#mobileExportPdf');
          const mobileExportHtml = $('#mobileExportHtml');
          const mobileExportEmail = $('#mobileExportEmail');
          const mobileExportEmbed = $('#mobileExportEmbed');
          const mobileExportSchedule = $('#mobileExportSchedule');

          if (mobileExportCsv) {
            mobileExportCsv.addEventListener('click', () => {
              exportAsCSV();
              closeMobileMenu();
            });
          }

          if (mobileExportExcel) {
            mobileExportExcel.addEventListener('click', () => {
              exportAsExcel();
              closeMobileMenu();
            });
          }

          if (mobileExportPdf) {
            mobileExportPdf.addEventListener('click', () => {
              exportAsPDF();
              closeMobileMenu();
            });
          }

          if (mobileExportHtml) {
            mobileExportHtml.addEventListener('click', () => {
              exportAsHTML();
              closeMobileMenu();
            });
          }

          if (mobileExportEmail) {
            mobileExportEmail.addEventListener('click', () => {
              shareViaEmail();
              closeMobileMenu();
            });
          }

          if (mobileExportEmbed) {
            mobileExportEmbed.addEventListener('click', () => {
              showEmbedCode();
              closeMobileMenu();
            });
          }

          if (mobileExportSchedule) {
            mobileExportSchedule.addEventListener('click', () => {
              // Schedule functionality - for now just show notification
              showNotification('Auto-schedule feature coming soon!', 'info');
              closeMobileMenu();
            });
          }

          const mobileShareBtn = $('#mobileShareBtn');

          if (mobileShareBtn) {
            mobileShareBtn.addEventListener('click', () => {
              shareScenario();
              closeMobileMenu();
            });
          }

          const mobileTemplatesBtn = $('#mobileTemplatesBtn');
          if (mobileTemplatesBtn) {
            mobileTemplatesBtn.addEventListener('click', () => {
              const options = $('#mobileTemplatesOptions');
              if (options) {
                _closeAllMobileSubmenus();
                options.style.display = options.style.display === 'flex' ? 'none' : 'flex';
              }
            });
          }

          // Close any open mobile submenus
          function _closeAllMobileSubmenus() {
            try {
              document.querySelectorAll('.mobile-submenu').forEach(el => {
                if (el && el.style) el.style.display = 'none';
              });
              // Also hide known submenu containers
              const containers = ['#mobileTemplatesOptions', '#mobileExportOptions', '#mobileShareOptions'];
              containers.forEach(sel => {
                const c = document.querySelector(sel);
                if (c && c.style) c.style.display = 'none';
              });
            } catch (e) {
              // Fail silently in environments without DOM
            }
          }

          document.querySelectorAll('.mobile-templates-options .mobile-submenu-btn').forEach(option => {
            option.addEventListener('click', (e) => {
              e.preventDefault();
              const template = e.target.dataset.template;
              const menu = $('#mobileTemplatesOptions');
              if (menu) menu.style.display = 'none';

              // Track template usage
              if (window.profitPathAnalytics) {
                window.profitPathAnalytics.trackTemplateUsage(template, e.target.textContent.trim());
              }

              loadIndustryTemplate(template);
              closeMobileMenu(); // Close mobile menu after loading template
            });
          });

          const mobileScenariosBtn = $('#mobileScenariosBtn');

          if (mobileScenariosBtn) {
            mobileScenariosBtn.addEventListener('click', () => {
              openScenarioModal();
              closeMobileMenu();
            });
          }

          const mobileAnalyticsBtn = $('#mobileAnalyticsBtn');
          if (mobileAnalyticsBtn) {
            mobileAnalyticsBtn.addEventListener('click', () => {
              // More robust check for analytics UI
              const checkAnalyticsUI = () => {
                if (window.profitPathAnalyticsUI) {
                  // Check if method exists on instance or prototype
                  if (typeof window.profitPathAnalyticsUI.showAnalyticsDashboard === 'function') {
                    window.profitPathAnalyticsUI.showAnalyticsDashboard();
                  } else if (typeof window.profitPathAnalyticsUI.constructor.prototype.showAnalyticsDashboard === 'function') {
                    // Call via prototype if instance method not available
                    window.profitPathAnalyticsUI.constructor.prototype.showAnalyticsDashboard.call(window.profitPathAnalyticsUI);
                  } else {
                    console.warn('Mobile Analytics UI method not available, retrying...');
                    setTimeout(checkAnalyticsUI, 100);
                  }
                } else {
                  console.warn('Mobile Analytics UI not loaded yet');
                  setTimeout(checkAnalyticsUI, 100);
                }
              };
              checkAnalyticsUI();
              closeMobileMenu();
            });
          }

          const mobileFeedbackBtn = $('#mobileFeedbackBtn');
          if (mobileFeedbackBtn) {
            mobileFeedbackBtn.addEventListener('click', () => {
              // More robust check for feedback UI
              const checkFeedbackUI = () => {
                if (window.feedbackUI) {
                  // Check if method exists on instance or prototype
                  if (typeof window.feedbackUI.openFeedbackModal === 'function') {
                    window.feedbackUI.openFeedbackModal();
                  } else if (typeof window.feedbackUI.constructor.prototype.openFeedbackModal === 'function') {
                    // Call via prototype if instance method not available
                    window.feedbackUI.constructor.prototype.openFeedbackModal.call(window.feedbackUI);
                  } else {
                    console.warn('Mobile Feedback UI method not available, retrying...');
                    setTimeout(checkFeedbackUI, 100);
                  }
                } else {
                  console.warn('Mobile Feedback UI not loaded yet');
                  setTimeout(checkFeedbackUI, 100);
                }
              };
              checkFeedbackUI();
              closeMobileMenu();
            });
          }

          const mobileHelpBtn = $('#mobileHelpBtn');
          if (mobileHelpBtn) {
            mobileHelpBtn.addEventListener('click', () => {
              // Call the same help menu function as desktop
              if (typeof showHelpMenu === 'function') {
                showHelpMenu();
              } else {
                console.warn('showHelpMenu function not available');
              }
              closeMobileMenu();
            });
          }

          const mobileSettingsBtn2 = $('#mobileSettingsBtn');
          if (mobileSettingsBtn) {
            mobileSettingsBtn.addEventListener('click', () => {
              const settingsCogBtn = $('#settingsCogBtn');
              if (settingsCogBtn) {
                settingsCogBtn.click();
              }
              closeMobileMenu();
            });
          }

          $('#offeringsBody').addEventListener('input', onTableInput);
          $('#offeringsBody').addEventListener('click', onTableClick);

          // Save state when table content changes
          $('#offeringsBody').addEventListener('input', persistState);
          $('#offeringsBody').addEventListener('click', () => setTimeout(persistState, 0));

          // Scenario modal wiring
          $('#scenariosBtn').addEventListener('click', openScenarioModal);
          $('#scenariosCloseBtn').addEventListener('click', closeScenarioModal);

          // Desktop menu buttons wiring - defer until scripts are loaded
          function setupDesktopMenuButtons() {
            const analyticsBtn = $('#analyticsBtn');
            if (analyticsBtn) {
              analyticsBtn.addEventListener('click', () => {
                // More robust check for analytics UI
                const checkAnalyticsUI = () => {
                  if (window.profitPathAnalyticsUI) {
                    // Check if method exists on instance or prototype
                    if (typeof window.profitPathAnalyticsUI.showAnalyticsDashboard === 'function') {
                      window.profitPathAnalyticsUI.showAnalyticsDashboard();
                    } else if (typeof window.profitPathAnalyticsUI.constructor.prototype.showAnalyticsDashboard === 'function') {
                      // Call via prototype if instance method not available
                      window.profitPathAnalyticsUI.constructor.prototype.showAnalyticsDashboard.call(window.profitPathAnalyticsUI);
                    } else {
                      console.warn('Analytics UI method not available, retrying...');
                      setTimeout(checkAnalyticsUI, 100);
                    }
                  } else {
                    console.warn('Analytics UI not loaded yet');
                    setTimeout(checkAnalyticsUI, 100);
                  }
                };
                checkAnalyticsUI();
              });
            }

            const desktopFeedbackBtn = $('#desktopFeedbackBtn');
            if (desktopFeedbackBtn) {
              desktopFeedbackBtn.addEventListener('click', () => {
                // More robust check for feedback UI
                const checkFeedbackUI = () => {
                  if (window.feedbackUI) {
                    // Check if method exists on instance or prototype
                    if (typeof window.feedbackUI.openFeedbackModal === 'function') {
                      window.feedbackUI.openFeedbackModal();
                    } else if (typeof window.feedbackUI.constructor.prototype.openFeedbackModal === 'function') {
                      // Call via prototype if instance method not available
                      window.feedbackUI.constructor.prototype.openFeedbackModal.call(window.feedbackUI);
                    } else {
                      console.warn('Feedback UI method not available, retrying...');
                      setTimeout(checkFeedbackUI, 100);
                    }
                  } else {
                    console.warn('Feedback UI not loaded yet');
                    setTimeout(checkFeedbackUI, 100);
                  }
                };
                checkFeedbackUI();
              });
            }
          }

          // Setup desktop buttons after DOM is ready
          if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', setupDesktopMenuButtons);
          } else {
            setupDesktopMenuButtons();
          }

          $('#saveScenarioBtn').addEventListener('click', () => {
            const name = $('#scenarioNameInput').value;
            saveScenario(name);
          });

          // Allow Enter key to save scenario
          $('#scenarioNameInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
              const name = $('#scenarioNameInput').value;
              saveScenario(name);
            }
          });

          // Close modal on Escape key
          document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && !$('#scenariosModal').classList.contains('hidden')) {
              closeScenarioModal();
            }
          });


          // ============================================================================
          // SCENARIO COMPARISON SYSTEM
          // ============================================================================

          // Helper to get selected scenario IDs from dropdowns
          function getSelectedComparisonScenarios() {
            const scenario1Id = $('#compareScenario1').value;
            const scenario2Id = $('#compareScenario2').value;
            return { scenario1Id, scenario2Id };
          }

          // Populate scenario dropdowns
          function populateComparisonDropdowns() {
            const scenarios = getAllScenarios();
            const select1 = $('#compareScenario1');
            const select2 = $('#compareScenario2');
            if (!select1 || !select2) return;

            select1.innerHTML = '<option value="">Select first scenario...</option>';
            select2.innerHTML = '<option value="">Select second scenario...</option>';

            scenarios.forEach(s => {
              const option1 = document.createElement('option');
              option1.value = s.id;
              option1.textContent = s.name;
              select1.appendChild(option1);

              const option2 = document.createElement('option');
              option2.value = s.id;
              option2.textContent = s.name;
              select2.appendChild(option2);
            });
          }

          // Render the comparison table
          function renderComparisonResults(metrics1, metrics2) {
            const comparisonResultsEl = $('#comparisonResults');
            if (!comparisonResultsEl) return;

            // Render into the wrapper div, not directly into comparisonResultsEl
            const tableWrap = comparisonResultsEl.querySelector('.comparison-table-wrap');
            if (!tableWrap) return;

            const metricsToCompare = [
              { label: 'Clients', key: 'clients', format: fmtInt },
              { label: 'Annual Sessions', key: 'annualSessions', format: fmtInt },
              { label: 'Service Hours', key: 'serviceHours', format: fmtInt },
              { label: 'Utilization', key: 'utilizationPct', format: fmtPct1 },
              { label: 'Revenue', key: 'revenue', format: fmtMoney0 },
              { label: 'Fixed Costs', key: 'annualFixedCosts', format: fmtMoney0 },
              { label: 'Payroll', key: 'annualPayroll', format: fmtMoney0 },
              { label: 'Variable Costs', key: 'annualVariableCosts', format: fmtMoney0 },
              { label: 'Net Income', key: 'netIncome', format: fmtMoney0 },
              { label: 'Break-Even Clients', key: 'breakEvenClients', format: fmtInt },
              { label: 'Break-Even Revenue', key: 'breakEvenRevenue', format: fmtMoney0 },
              { label: 'Contribution Margin', key: 'contributionMarginPerClient', format: fmtMoney0 },
            ];

            let tableHtml = '<table class="comparison-table"><thead><tr><th>Metric</th><th class="scenario-col">Scenario 1</th><th class="scenario-col">Scenario 2</th><th class="difference-col">Difference</th></tr></thead><tbody>';

            metricsToCompare.forEach(m => {
              const val1 = metrics1[m.key];
              const val2 = metrics2[m.key];
              const diff = val2 - val1;

              let diffClass = 'difference-neutral';
              if (m.key.includes('income') || m.key.includes('revenue') || m.key.includes('margin')) {
                if (diff > 0) diffClass = 'difference-positive';
                else if (diff < 0) diffClass = 'difference-negative';
              } else if (m.key.includes('cost')) {
                if (diff > 0) diffClass = 'difference-negative';
                else if (diff < 0) diffClass = 'difference-positive';
              } else if (m.key.includes('utilization') || m.key.includes('clients') || m.key.includes('sessions') || m.key.includes('hours')) {
                if (diff > 0) diffClass = 'difference-positive';
                else if (diff < 0) diffClass = 'difference-negative';
              }

              tableHtml += '<tr><td class="metric-name">' + m.label + '</td><td class="scenario-col">' + m.format(val1) + '</td><td class="scenario-col">' + m.format(val2) + '</td><td class="difference-col ' + diffClass + '">' + m.format(diff) + '</td></tr>';
            });

            tableHtml += '</tbody></table>';
            tableWrap.innerHTML = tableHtml; // Assign to wrapper
            comparisonResultsEl.style.display = 'block';
          }

          // Handle comparison logic
          function handleComparison() {
            const comparisonErrorEl = $('#comparisonError');
            if (comparisonErrorEl) comparisonErrorEl.style.display = 'none'; // Hide previous error

            const { scenario1Id, scenario2Id } = getSelectedComparisonScenarios();
            const scenarios = getAllScenarios();

            const scenario1 = scenarios.find(s => s.id === scenario1Id);
            const scenario2 = scenarios.find(s => s.id === scenario2Id);

            if (!scenario1 || !scenario2) {
              $('#comparisonResults').style.display = 'none';
              return;
            }

            // Calculate metrics for both scenarios
            const metrics1 = calc(scenario1.data || scenario1.state); // Handle older scenario structure
            const metrics2 = calc(scenario2.data || scenario2.state); // Handle older scenario structure

            renderComparisonResults(metrics1, metrics2);
          }

          // Update scenarios list and comparison dropdowns when modal opens
          const scenariosModal = $('#scenariosModal');
          if (scenariosModal) {
            // Original scenario modal close and button handlers (delegated)
            scenariosModal.addEventListener('click', (e) => {
              // Only close modal if clicking on close button, overlay, or outside modal content
              if (e.target.closest('.modal-header .btn-close') ||
                e.target.closest('#scenariosOverlay')) {
                closeScenarioModal();
              } else if (e.target.closest('.load-btn, .delete-btn')) {
                const btn = e.target.closest('.load-btn, .delete-btn');
                const scenarioId = btn.dataset.scenarioId;
                if (!scenarioId) return;

                if (btn.classList.contains('load-btn')) {
                  loadScenario(scenarioId);
                  closeScenarioModal();
                } else if (btn.classList.contains('delete-btn')) {
                  deleteScenario(scenarioId);
                  closeScenarioModal();
                }
              }
              // Handle comparison dropdowns to prevent default behavior from closing modal
              else if (e.target.closest('.scenario-select')) {
                e.stopPropagation();
              }
            });

            // Populate comparison dropdowns when the modal becomes visible
            const observer = new MutationObserver((mutationsList) => {
              for (const mutation of mutationsList) {
                if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
                  if (!scenariosModal.classList.contains('hidden')) {
                    populateComparisonDropdowns();
                    handleComparison(); // Also run comparison if both are selected
                  } else {
                    // Hide comparison results when modal is closed
                    $('#comparisonResults').style.display = 'none';
                  }
                }
              }
            });
            observer.observe(scenariosModal, { attributes: true, attributeFilter: ['class'] });

            // Initial population when app loads
            populateComparisonDropdowns();
          }

          // Event listeners for comparison dropdowns and button
          const compareBtn = $('#compareBtn');
          if (compareBtn) {
            compareBtn.addEventListener('click', handleComparison);
          }

          const compareScenario1 = $('#compareScenario1');
          if (compareScenario1) {
            compareScenario1.addEventListener('change', handleComparison);
          }

          const compareScenario2 = $('#compareScenario2');
          if (compareScenario2) {
            compareScenario2.addEventListener('change', handleComparison);
          }

          // Load scenario from URL first (if present), then localStorage
          const loadedFromURL = loadScenarioFromURL();

          // Check for test scenario loading
          loadTestScenarios();
          loadSpecificTestScenario(Object.keys(TEST_SCENARIOS).find(key => new URLSearchParams(window.location.search).get('testScenario') === key));

          wire(loadedFromURL);

          // Restore any scheduled report generation
          restoreScheduling();

          // Run initial render in a safe guard so any runtime errors are reported to the debug panel
          try {
            render();
          } catch (e) {
            console.error('Render failed:', e);
            const dbg = $('#debugPanel');
            if (dbg) dbg.textContent = 'Render error: ' + (e && e.stack ? e.stack : String(e));
          }


          // Global error handler to surface errors into the debug panel for easier debugging
          window.addEventListener('error', (ev) => {
            const dbg = $('#debugPanel');
            const msg = ev?.error?.stack || ev?.message || String(ev);
            console.error('Uncaught error:', ev.error || ev.message || ev);
            if (dbg) dbg.textContent = 'Uncaught error: ' + msg;
          });

          // Debug panel toggle wiring: collapsible panel above the simple chart
          function initDebugPanel() {
            const toggle = $('#debugToggle');
            const body = $('#debugBody');
            const pre = $('#debugPanel');
            if (!toggle || !body || !pre) return;

            // Update pre with calc() output and set a concise summary on the toggle
            function refreshDebug() {
              // Only refresh if debug panel is initialized and visible
              if (!pre || pre.style.display === 'none') return;

              try {
                const res = calc();
                pre.textContent = JSON.stringify(res, null, 2);
                toggle.textContent = '▶ Debug — clients: ' + (res.clients || 0) + ', revenue: ' + fmtMoney0(res.revenue || 0);
              } catch (e) {
                pre.textContent = 'Error generating debug: ' + (e && e.stack ? e.stack : String(e));
                toggle.textContent = '▶ Debug — error';
              }
            }

            // restore expanded state from localStorage
            const stored = localStorage.getItem('profitpath-debug-expanded');
            const expanded = stored === '1';
            if (expanded) {
              body.classList.remove('collapsed');
              body.setAttribute('aria-hidden', 'false');
              toggle.setAttribute('aria-expanded', 'true');
              toggle.textContent = toggle.textContent.replace(/^▶/, '▼');
            }

            toggle.addEventListener('click', () => {
              const isCollapsed = body.classList.toggle('collapsed');
              body.setAttribute('aria-hidden', isCollapsed ? 'true' : 'false');
              const expandedNow = !isCollapsed;
              toggle.setAttribute('aria-expanded', expandedNow ? 'true' : 'false');
              toggle.textContent = (expandedNow ? '▼' : '▶') + toggle.textContent.slice(1);
              localStorage.setItem('profitpath-debug-expanded', expandedNow ? '1' : '0');
              // refresh content when expanding
              if (expandedNow) refreshDebug();
            });

            // refresh periodically (keeps the debug info up to date while editing)
            setInterval(refreshDebug, 1500);
            // initial refresh
            refreshDebug();
          }

          // Initialize debug panel after DOM is ready
          try {
            initDebugPanel();
          } catch (e) {
            console.warn('Failed to init debug panel:', e);
          }

          // Persist chosen logo so future loads remember the finalized variant
          try {
            localStorage.setItem('profitpath-logo', 'final');
            document.documentElement.setAttribute('data-logo', 'final');
          } catch (e) {
            // non-fatal
          }

          // Register service worker for PWA functionality
          // TEMPORARILY DISABLED-forcing network CSS loading
          /*
          if ('serviceWorker' in navigator) {
                  window.addEventListener('load', () =>{
                    navigator.serviceWorker.register('/sw.js')
                      .then((registration) =>{
                        // Service Worker registered successfully
           
                        // Handle service worker updates
                        registration.addEventListener('updatefound', () =>{
                          const newWorker=registration.installing;
                          if (newWorker) {
                            newWorker.addEventListener('statechange', () =>{
                              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                                // New version available
                                if (confirm('A new version of ProfitPath is available. Reload to update?')) {
                                  newWorker.postMessage({ type: 'SKIP_WAITING' });
                                  window.location.reload();
                                }
                              }
                            });
                          }
                        });
                      })
                      .catch((_error) =>{
                        // Service Worker registration failed
                      });
                  });
          }
                */

          // Onboarding system for guided experience
          const _initializeOnboarding = () => {
            // Check if user has completed onboarding
            const onboardingCompleted = localStorage.getItem('onboardingCompleted') === 'true';

            // Always show help button (users can access help anytime)
            addOnboardingHelpButton();

            // Show welcome message for new users who haven't completed onboarding
            if (!onboardingCompleted) {
              setTimeout(() => {
                showWelcomeDialog();
              }, 1000);
            }

            // Initialize contextual tooltips
            initializeContextualTooltips();

            // Initialize progressive disclosure
            initializeProgressiveDisclosure();

            // Initialize scenarios functionality
            initializeScenarios();
          };

          // Initialize onboarding system after DOM is ready
          if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', _initializeOnboarding);
          } else {
            _initializeOnboarding();
          }

          // Scroll lock helpers for guided tour
          let _tourScrollLocked = false;
          let _tourPrevHtmlOverflow = '';
          let _tourPrevBodyOverflow = '';
          function _preventTourScroll(e) {
            // allow certain inputs inside the tour dialog (handled by pointer events), but
            // generally prevent default touch/wheel scrolling while tour is active
            e.preventDefault();
          }

          function _trapTourKeys(e) {
            // Prevent keyboard scrolling keys while tour active
            const blocked = ['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', ' '];
            if (blocked.includes(e.key)) {
              e.preventDefault();
            }
          }

          function lockScrollForTour() {
            if (_tourScrollLocked) return;
            _tourScrollLocked = true;
            try {
              _tourPrevHtmlOverflow = document.documentElement.style.overflow || '';
              _tourPrevBodyOverflow = document.body.style.overflow || '';
              document.documentElement.style.overflow = 'hidden';
              document.body.style.overflow = 'hidden';
            } catch (e) {
              // ignore
            }
            document.addEventListener('touchmove', _preventTourScroll, { passive: false });
            document.addEventListener('wheel', _preventTourScroll, { passive: false });
            document.addEventListener('keydown', _trapTourKeys, { passive: false });
          }

          function unlockScrollForTour() {
            if (!_tourScrollLocked) return;
            _tourScrollLocked = false;
            try {
              document.documentElement.style.overflow = _tourPrevHtmlOverflow || '';
              document.body.style.overflow = _tourPrevBodyOverflow || '';
            } catch (e) {
              // ignore
            }
            document.removeEventListener('touchmove', _preventTourScroll);
            document.removeEventListener('wheel', _preventTourScroll);
            document.removeEventListener('keydown', _trapTourKeys);
          }

          function addOnboardingHelpButton() {
            // The help button is now in the HTML, just add event listeners
            const helpButton = document.getElementById('helpBtn');
            if (!helpButton) return;

            helpButton.addEventListener('click', showHelpMenu);
          }

          function showWelcomeDialog() {
            const dialog = createOnboardingDialog({
              title: 'Welcome to ProfitPath! 🎉',
              content: '<div class="welcome-content"><p>Get started with your profitability analysis in just a few minutes.</p><p>Would you like a quick guided tour of the key features?</p></div><div style="display:flex;gap:10px;justify-content:center;"><button class="welcome-btn" data-action="tour" style="background:#007bff;color:white;border:none;padding:10px 20px;border-radius:6px;cursor:pointer;font-weight:bold;">Take Tour</button><button class="welcome-btn" data-action="industry" style="background:#f8f9fa;color:#333;border:1px solid #dee2e6;padding:10px 20px;border-radius:6px;cursor:pointer;">Choose Industry</button><button class="welcome-btn" data-action="skip" style="background:transparent;color:#666;border:none;padding:10px 20px;cursor:pointer;">Skip for Now</button></div>',
              buttons: [] // We'll handle buttons manually
            });

            // Add event listeners after dialog is created
            setTimeout(() => {
              document.querySelectorAll('.welcome-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                  const action = e.currentTarget.dataset.action;
                  dialog.remove(); // Close the dialog

                  if (action === 'tour') {
                    startGuidedTour();
                  } else if (action === 'industry') {
                    showIndustrySelector();
                  }
                  // Skip action just closes the dialog
                });
              });
            }, 100);

            document.body.appendChild(dialog);
          }

          function showIndustrySelector() {
            const industries = [
              { id: 'consulting', name: 'Consulting', icon: '💼', description: 'Professional services, advisory, strategy' },
              { id: 'cleaning', name: 'Cleaning Services', icon: '🧽', description: 'Residential and commercial cleaning' },
              { id: 'landscaping', name: 'Landscaping', icon: '🌿', description: 'Garden maintenance, lawn care' },
              { id: 'fitness', name: 'Fitness & Wellness', icon: '🏋️', description: 'Personal training, gym services' },
              { id: 'photography', name: 'Photography', icon: '📷', description: 'Event, portrait, commercial photography' },
              { id: 'other', name: 'Other Service Business', icon: '🏭', description: 'Custom service business setup' }
            ];

            const industryGrid = industries.map(industry => '<div class="industry-option" data-industry="' + industry.id + '">' +
              '<div class="industry-icon" style="font-size:32px;margin-bottom:8px;">' + industry.icon + '</div>' +
              '<div class="industry-name">' + industry.name + '</div>' +
              '<div class="industry-desc">' + industry.description + '</div>' +
              '</div>'
            ).join('');

            const dialog = createOnboardingDialog({
              title: 'What type of service business do you run?',
              content: '<div class="industry-grid">' + industryGrid + '</div><p style="margin-top:16px;color:var(--muted);">This helps us provide tailored guidance and templates.</p>',
              buttons: [
                { text: 'Continue', action: () => { }, primary: true },
                { text: 'Skip', action: () => { } }
              ]
            });

            // Add click handlers for industry options
            setTimeout(() => {
              document.querySelectorAll('.industry-option').forEach(option => {
                option.addEventListener('click', () => {
                  const industryId = option.dataset.industry;
                  selectIndustry(industryId, dialog);
                });
              });
            }, 100);

            document.body.appendChild(dialog);
          }

          function selectIndustry(industryId, dialog) {
            // Save selected industry
            localStorage.setItem('selectedIndustry', industryId);

            // Load industry-specific template
            loadOnboardingIndustryTemplate(industryId);

            // Close dialog and show success message
            dialog.remove();

            const successDialog = createOnboardingDialog({
              title: 'Great choice! 🎯',
              content: '<div class="success-content"><p>We\'ve loaded a template configuration for your industry.</p><p>Would you like to take a quick tour to learn how to customize it?</p></div><div style="display:flex;gap:10px;justify-content:center;"><button class="success-btn" data-action="tour" style="background:#007bff;color:white;border:none;padding:10px 20px;border-radius:6px;cursor:pointer;font-weight:bold;">Show Me How</button><button class="success-btn" data-action="explore" style="background:#f8f9fa;color:#333;border:1px solid #dee2e6;padding:10px 20px;border-radius:6px;cursor:pointer;">Explore on My Own</button></div>',
              buttons: [] // We'll handle buttons manually
            });

            // Add event listeners after dialog is created
            setTimeout(() => {
              document.querySelectorAll('.success-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                  const action = e.currentTarget.dataset.action;
                  successDialog.remove(); // Close the dialog

                  if (action === 'tour') {
                    startGuidedTour();
                  }
                  // Explore action just closes the dialog
                });
              });
            }, 100);

            document.body.appendChild(successDialog);
          }

          function loadOnboardingIndustryTemplate(industryId) {
            // Use the same INDUSTRY_TEMPLATES as single source of truth
            const template = window.INDUSTRY_TEMPLATES && window.INDUSTRY_TEMPLATES[industryId];
            if (template) {
              const config = template.config;

              // Apply template to current scenario - load all offerings like the main menu
              state.offerings = config.offerings.map(o => ({
                ...o,
                id: uuid(),
                mixPct: o.mixPct || (100 / config.offerings.length),
                currentClients: o.currentClients || 0
              }));

              // Apply employee and cost configuration
              state.fullTimeEmployees = config.fullTimeEmployees || 1;
              state.partTimeEmployees = config.partTimeEmployees || 0;
              state.fullTimeEmployeePay = config.fullTimeEmployeePay || 60000;
              state.partTimeEmployeePay = config.partTimeEmployeePay || 30000;
              state.monthlyCosts = config.monthlyCosts || 250;
              state.productiveUtilizationPct = config.productiveUtilizationPct || 80;
              state.targetUtilizationPct = config.targetUtilizationPct || 85;

              // Refresh the UI
              render();
              persistState();
            }
          }

          function startGuidedTour() {
            // Lock scrolling while the guided tour is active so users can't interrupt
            // the tour by manually scrolling. Programmatic scrolling (scrollIntoView)
            // is still allowed.
            lockScrollForTour();
            const tour = createGuidedTour();
            tour.start();
          }

          // Global tour state
          let tourSteps = [];
          let tourActive = false;

          function createGuidedTour() {
            const isMobile = window.innerWidth < 768;
            tourSteps = [
              {
                target: '.logo',
                title: 'Welcome to ProfitPath',
                content: 'This is your profitability dashboard. Let\'s take a quick tour of the key areas.',
                position: 'bottom'
              },
              {
                target: '.inputs-fields .field:first-child',
                title: 'Choose Your Mode',
                content: 'Select \'Forecast\' mode to plan capacity for a target client count. Use \'Current\' mode to analyze your active existing client base.',
                position: 'right'
              },
              {
                target: '.team-config-group',
                title: 'Team Configuration',
                content: 'Enter your team size and compensation details. The calculator assumes 2080 paid hours per year per employee.',
                position: 'right'
              },
              {
                target: '.offerings-section .section-h',
                title: 'Define Your Services',
                content: 'Add your service offerings with pricing, frequency, and costs. Each offering can have different terms.',
                position: 'right'
              },
              {
                target: 'aside.card .card-h',
                title: 'Key Profitability Metric',
                content: 'This shows your net income after all expenses. Green indicates profitability, red indicates losses.',
                position: 'top'
              },
              {
                target: 'aside.card .capacity',
                title: 'Capacity Utilization',
                content: 'Monitor how busy your team is. Aim for 80-90% utilization to balance profitability and client service.',
                position: 'left'
              },
              {
                target: '.break-even-section-wrapper',
                title: 'Break-even Analysis',
                content: 'See how many clients you need to break even with a detailed break-even analysis.',
                position: 'left'
              },
              {
                target: '.charts-visualizations-container',
                title: 'Charts & Visualizations',
                content: 'Explore interactive charts and graphs that help visualize your business metrics and financial analysis.',
                position: 'top'
              },
              {
                target: isMobile ? '#hamburgerBtn' : '.header-actions',
                title: 'Save, Export & Share',
                content: isMobile ? 'Access all saving, exporting, and sharing tools from the menu.' : 'Save scenarios for comparison, generate professional reports, or share your analysis with stakeholders.',
                position: 'bottom'
              }
            ];

            tourActive = true;

            return {
              start: () => showTourStep(0)
            };
          }

          async function showTourStep(stepIndex) {
            if (!tourActive || stepIndex >= tourSteps.length) {
              completeTour();
              return;
            }

            const step = tourSteps[stepIndex];
            let target = document.querySelector(step.target);

            // Try fallback selectors if primary target not found
            if (!target) {
              const fallbacks = {
                '.header': '.container',
                '.offering-item': '.card',
                '.metrics-section': '.card',
                '#scenariosBtn': '.btn',
                '#shareBtn': '.btn'
              };
              target = document.querySelector(fallbacks[step.target] || step.target);
            }

            if (!target) {
              console.warn('Tour step ' + stepIndex + ' target not found: ' + step.target + ', skipping...');
              showTourStep(stepIndex + 1);
              return;
            }

            // Scroll the target element into view smoothly, then wait for scrolling to stop
            target.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });

            // Wait until scrolling has settled and the target is roughly centered before creating the tooltip.
            // This avoids creating the overlay while the page is still animating which caused the overlay
            // to be slightly offset when long smooth-scrolls were required.
            await waitForTargetSettled(target, { timeoutMs: 3000, idleMs: 250 });

            // Remove any leftover tooltips/overlays to avoid duplicates or jumping.
            document.querySelectorAll('.onboarding-tooltip, .onboarding-overlay').forEach(el => el.remove());

            // Now create the tooltip (createTooltip will append it to the DOM)
            const tooltip = createTooltip(step, target, null, stepIndex, tourSteps);

            // Add keyboard support
            const handleKeydown = (e) => {
              if (e.key === 'Escape' && tourActive) {
                document.removeEventListener('keydown', handleKeydown);
                exitTour();
              }
            };
            document.addEventListener('keydown', handleKeydown);

            // Store cleanup function
            tooltip._cleanupKeyboard = () => {
              document.removeEventListener('keydown', handleKeydown);
            };
          }

          // Helper to wait until scrolling stops and the target is approximately centered
          function waitForTargetSettled(target, { timeoutMs = 3000, idleMs = 250, stableMs = 250 } = {}) {
            return new Promise((resolve) => {
              let idleTimer = null;
              let timeoutTimer = null;
              let rafId = null;

              function cleanup() {
                if (idleTimer) clearTimeout(idleTimer);
                if (timeoutTimer) clearTimeout(timeoutTimer);
                if (rafId) cancelAnimationFrame(rafId);
                window.removeEventListener('scroll', onScroll, { passive: true });
                window.removeEventListener('resize', onScroll);
              }

              // After we observe no scroll for idleMs, ensure the element's rect is stable
              // for stableMs milliseconds before resolving. If the element is not near
              // the center, perform an immediate snap and continue waiting for stability.
              function ensureStableAndResolve() {
                const startTime = Date.now();
                let lastRect = target.getBoundingClientRect();
                let lastChange = Date.now();

                // If target is far from center, snap it into view first (instant)
                const rectNow = lastRect;
                const viewportCenterY = window.innerHeight / 2;
                const deltaCenter = Math.abs((rectNow.top + rectNow.bottom) / 2 - viewportCenterY);
                if (deltaCenter > window.innerHeight * 0.2) {
                  try {
                    target.scrollIntoView({ behavior: 'auto', block: 'center', inline: 'center' });
                  } catch (e) {
                    // ignore
                  }
                  // update lastRect after snapping
                  lastRect = target.getBoundingClientRect();
                  lastChange = Date.now();
                }

                function checkRect() {
                  const rect = target.getBoundingClientRect();
                  const dx = Math.abs(rect.top - lastRect.top) + Math.abs(rect.left - lastRect.left) + Math.abs(rect.width - lastRect.width) + Math.abs(rect.height - lastRect.height);
                  if (dx > 2) {
                    lastRect = rect;
                    lastChange = Date.now();
                  }

                  if (Date.now() - lastChange >= stableMs) {
                    cleanup();
                    resolve();
                    return;
                  }

                  if (Date.now() - startTime >= timeoutMs) {
                    cleanup();
                    resolve();
                    return;
                  }

                  rafId = requestAnimationFrame(checkRect);
                }

                checkRect();
              }

              function onScroll() {
                if (idleTimer) clearTimeout(idleTimer);
                idleTimer = setTimeout(() => {
                  ensureStableAndResolve();
                }, idleMs);
              }

              // Start listeners and safety timeout
              window.addEventListener('scroll', onScroll, { passive: true });
              window.addEventListener('resize', onScroll);

              timeoutTimer = setTimeout(() => {
                cleanup();
                resolve();
              }, timeoutMs + 200);

              // Kick off initial idle check (in case no scroll events occur)
              onScroll();
            });
          }

          function exitTour() {
            tourActive = false;
            // Remove all tooltips and overlays
            // Unlock scrolling when the tour exits
            unlockScrollForTour();
            document.querySelectorAll('.onboarding-tooltip, .onboarding-overlay').forEach(el => el.remove());

            // Show exit confirmation
            const exitDialog = createOnboardingDialog({
              title: 'Tour Exited',
              content: '<p>You can resume the guided tour anytime by clicking the ❓ help button in the top-right corner.</p><p>Feel free to explore the features at your own pace!</p>',
              buttons: [
                { text: 'Got it!', action: () => { } }
              ]
            });

            document.body.appendChild(exitDialog);
          }

          function completeTour() {
            tourActive = false;
            // Unlock scrolling when the tour completes
            unlockScrollForTour();
            localStorage.setItem('onboardingCompleted', 'true');

            const completionDialog = createOnboardingDialog({
              title: 'Tour Complete! 🎉',
              content: '<p>You now know the basics of ProfitPath!</p><p>Explore the features at your own pace. Use the ❓ help button anytime for guidance.</p>',
              buttons: [
                { text: 'Got it!', action: () => { }, primary: true }
              ]
            });

            document.body.appendChild(completionDialog);
          }

          function createTooltip(step, target, onNext, stepIndex, steps) {
            const isMobile = window.innerWidth < 768;

            // Get fresh bounding rect after scrolling completes
            const rect = target.getBoundingClientRect();

            // Calculate final position first
            let left, top, transform;

            if (isMobile) {
              // On mobile, always position below the element for better visibility
              left = Math.max(10, Math.min(window.innerWidth - 290, rect.left + rect.width / 2 - 140));
              top = rect.bottom + 10;
              transform = 'translate(0, 0)';
            } else {
              switch (step.position) {
                case 'top':
                  left = rect.left + rect.width / 2;
                  top = rect.top - 10;
                  transform = 'translate(-50%, -100%)';
                  break;
                case 'bottom':
                  left = rect.left + rect.width / 2;
                  top = rect.bottom + 10;
                  transform = 'translate(-50%, 0)';
                  break;
                case 'left':
                  left = rect.left - 10;
                  top = rect.top + rect.height / 2;
                  transform = 'translate(-100%, -50%)';
                  break;
                case 'right':
                  left = rect.right + 10;
                  top = rect.top + rect.height / 2;
                  transform = 'translate(0, -50%)';
                  break;
                default:
                  left = rect.left + rect.width / 2;
                  top = rect.bottom + 10;
                  transform = 'translate(-50%, 0)';
              }
            }

            // Ensure tooltip stays within viewport bounds
            const tooltipWidth = isMobile ? 280 : 300;
            const tooltipHeight = 200; // Approximate height with navigation

            if (left < 10) {
              left = 10;
            }
            if (left + tooltipWidth > window.innerWidth - 10) {
              left = window.innerWidth - tooltipWidth - 10;
            }
            if (top - tooltipHeight < 10) {
              top = tooltipHeight + 10;
              if (!isMobile) transform = transform.replace('-100%', '0');
            }
            if (top + tooltipHeight > window.innerHeight - 10) {
              top = window.innerHeight - tooltipHeight - 10;
              if (!isMobile) transform = transform.replace('0', '-100%');
            }

            // Create tooltip with final position-no intermediate rendering
            const tooltip = document.createElement('div');
            tooltip.className = 'onboarding-tooltip';
            tooltip.style.cssText = 'position: fixed;z-index: 10000;background: white;border: 2px solid #007bff;border-radius: 8px;padding: 16px;box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);max-width: ' + (isMobile ? '280px' : '300px') + ';pointer-events: auto;font-size: ' + (isMobile ? '14px' : '16px') + ';left: ' + left + 'px;top: ' + top + 'px;transform: ' + transform + ';opacity: 0;transition: opacity 0.3s ease-out;';

            // Append to DOM and fade in from final position
            document.body.appendChild(tooltip);
            requestAnimationFrame(() => {
              tooltip.style.opacity = '1';
            });

            // Create progress dots
            const progressDots = steps.map((_, index) => '<span class="tour-dot ' + (index === stepIndex ? 'active' : '') + ' ' + (index < stepIndex ? 'completed' : '') + '" data-step="' + index + '" style="display:inline-block;width:8px;height:8px;border-radius:50%;margin:0 2px;cursor:pointer;background:' + (index === stepIndex ? '#007bff' : index < stepIndex ? '#28a745' : '#ddd') + ';transition:all 0.2s;"></span>').join('');

            tooltip.innerHTML = '<div style="position:relative;padding-right:24px;"><button class="tour-exit-btn" style="position:absolute;top:0;right:0;background:transparent;border:none;font-size:16px;cursor:pointer;color:var(--text, #666);padding:4px;line-height:1;">✕</button><div style="font-weight:bold;margin-bottom:8px;color:var(--text, #007bff);">' + step.title + '</div><div style="margin-bottom:16px;color:var(--text, #333);line-height:1.4;">' + step.content + '</div><div style="display:flex;align-items:center;justify-content:center;margin-bottom:12px;position:relative;"><div class="tour-navigation" style="display:flex;align-items:center;">' + (stepIndex > 0 ? '<button class="tour-arrow tour-arrow-prev" data-direction="prev" style="background:#f8f9fa;border:1px solid #dee2e6;border-radius:4px;width:24px;height:40px;display:flex;align-items:center;justify-content:center;cursor:pointer;margin-right:8px;font-size:18px;line-height:1;">‹</button>' : '<div style="width:32px;"></div>') + '<div class="tour-dots" style="display:flex;align-items:center;">' + progressDots + '</div>' + (stepIndex < steps.length - 1 ? '<button class="tour-arrow tour-arrow-next" data-direction="next" style="background:#007bff;color:white;border:none;border-radius:4px;width:24px;height:40px;display:flex;align-items:center;justify-content:center;cursor:pointer;margin-left:8px;font-size:18px;line-height:1;">›</button>' : '<button class="tour-finish-btn" style="background:#28a745;color:white;border:none;border-radius:4px;width:24px;height:40px;display:flex;align-items:center;justify-content:center;cursor:pointer;margin-left:8px;font-size:16px;line-height:1;">✓</button>') + '</div></div></div>';

            // Add event listeners for navigation
            setTimeout(() => {
              // Exit button
              const exitBtn = tooltip.querySelector('.tour-exit-btn');
              if (exitBtn) {
                exitBtn.addEventListener('click', (e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  exitTour();
                });
              }

              // Navigation buttons
              const prevBtn = tooltip.querySelector('.tour-arrow-prev');
              const nextBtn = tooltip.querySelector('.tour-arrow-next');
              const finishBtn = tooltip.querySelector('.tour-finish-btn');

              if (prevBtn) {
                prevBtn.addEventListener('click', (e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  tooltip.remove();
                  if (stepIndex > 0) {
                    showTourStep(stepIndex - 1);
                  }
                });
              }

              if (nextBtn) {
                nextBtn.addEventListener('click', (e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  tooltip.remove();
                  if (stepIndex < steps.length - 1) {
                    showTourStep(stepIndex + 1);
                  }
                });
              }

              if (finishBtn) {
                finishBtn.addEventListener('click', (e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  tooltip.remove();
                  completeTour();
                });
              }

              // Progress dots
              const dots = tooltip.querySelectorAll('.tour-dot');
              dots.forEach(dot => {
                dot.addEventListener('click', (e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  const targetStep = parseInt(e.currentTarget.dataset.step);
                  tooltip.remove();
                  showTourStep(targetStep);
                });
              });
            }, 50);

            // Add event listener for the button
            setTimeout(() => {
              const nextBtn = tooltip.querySelector('.tooltip-next-btn');
              if (nextBtn) {
                nextBtn.addEventListener('click', () => {
                  tooltip.remove();
                  if (onNext) onNext();
                });
              }
            }, 10);

            // Highlighting: place a fixed overlay around the target so we don't rely on modifying
            // the target's own styles (avoids stacking-context/overflow issues and layout shifts).
            const OVERLAY_PAD = 9; // pixels to expand the highlight beyond the element (increased by 1 to keep outer perimeter)
            const BORDER_THICKNESS = 7; // highlight border thickness (reduced by 1px for less clipping)

            const rect2 = target.getBoundingClientRect();
            const computed = window.getComputedStyle(target);
            // If the target has no rounded corners, use a mild default so highlights look rounded
            const parsedBR = parseFloat(computed.borderRadius) || 0;
            const borderRadius = (parsedBR && parsedBR > 4) ? parsedBR + 'px' : '10px';

            const overlay = document.createElement('div');
            overlay.className = 'onboarding-overlay';
            overlay.style.cssText = 'position: fixed;left: ' + (rect2.left - OVERLAY_PAD) + 'px;top: ' + (rect2.top - OVERLAY_PAD) + 'px;width: ' + (rect2.width + OVERLAY_PAD * 2) + 'px;height: ' + (rect2.height + OVERLAY_PAD * 2) + 'px;border: ' + BORDER_THICKNESS + 'px solid #007bff;border-radius: ' + borderRadius + ';box-shadow: 0 8px 32px rgba(0, 123, 255, 0.12);pointer-events: none;z-index: 9999;animation: pulse 2s infinite;';

            // Append overlay underneath the tooltip (tooltip uses z-index:10000)
            document.body.appendChild(overlay);

            // Store overlay for cleanup
            tooltip._overlay = overlay;

            // Wrap original remove to also remove the overlay and keyboard handler
            const originalRemove = tooltip.remove;
            tooltip.remove = function () {
              try {
                if (tooltip._overlay && tooltip._overlay.parentNode) tooltip._overlay.parentNode.removeChild(tooltip._overlay);
              } catch (e) {
                // ignore
              }
              if (tooltip._cleanupKeyboard) {
                tooltip._cleanupKeyboard();
              }
              originalRemove.call(this);
            };

            return tooltip;
          }

          function createOnboardingDialog({ title, content, buttons }) {
            const dialog = document.createElement('div');
            dialog.className = 'onboarding-dialog-overlay';
            dialog.style.cssText = 'position: fixed;top: 0;left: 0;right: 0;bottom: 0;background: rgba(0, 0, 0, 0.6);display: flex;align-items: center;justify-content: center;z-index: 10001;';

            const dialogContent = document.createElement('div');
            dialogContent.style.cssText = 'background: white;border-radius: 12px;padding: 24px;max-width: 500px;width: 90%;box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);';

            dialogContent.innerHTML = '<h2 style="margin:0 0 16px 0;color:var(--text, #333);font-size:24px;">' + title + '</h2><div style="color:var(--text, #666);line-height:1.5;">' + content + '</div><div style="margin-top:24px;text-align:right;display:flex;gap:8px;justify-content:flex-end;">' + buttons.map((btn, index) => '<button class="dialog-btn" data-action="' + index + '" data-primary="' + (btn.primary ? 'true' : 'false') + '" style="padding:8px 16px;border:' + (btn.primary ? 'none' : '1px solid #ddd') + ';border-radius:6px;background:' + (btn.primary ? '#007bff' : 'white') + ';color:' + (btn.primary ? 'white' : '#333') + ';cursor:pointer;font-weight:' + (btn.primary ? 'bold' : 'normal') + ';">' + btn.text + '</button>').join('') + '</div>';

            // Add event listeners for dialog buttons
            setTimeout(() => {
              const dialogBtns = dialogContent.querySelectorAll('.dialog-btn');
              dialogBtns.forEach((btn, index) => {
                btn.addEventListener('click', () => {
                  const action = buttons[index]?.action;
                  dialog.remove();
                  if (action && typeof action === 'function') {
                    action();
                  }
                });
              });
            }, 10);

            dialog.appendChild(dialogContent);
            return dialog;
          }

          function showHelpMenu() {
            const helpDialog = createOnboardingDialog({
              title: 'Help & Learning Center',
              content: '<div style="display:grid;gap:12px;"><button class="help-menu-btn" data-action="tour" style="display:block;width:100%;padding:12px;background:#f8f9fa;border:1px solid #dee2e6;border-radius:6px;text-align:left;cursor:pointer;">🎯 <strong>Take Guided Tour</strong><br><small>Step-by-step walkthrough of key features</small></button><button class="help-menu-btn" data-action="industry" style="display:block;width:100%;padding:12px;background:#f8f9fa;border:1px solid #dee2e6;border-radius:6px;text-align:left;cursor:pointer;">🏢 <strong>Change Industry</strong><br><small>Switch to a different business template</small></button><button class="help-menu-btn" data-action="tooltips" style="display:block;width:100%;padding:12px;background:#f8f9fa;border:1px solid #dee2e6;border-radius:6px;text-align:left;cursor:pointer;">💡 <strong>Show Tooltips</strong><br><small>Enable contextual help throughout the app</small></button></div>',
              buttons: [
                { text: 'Close', action: () => { } }
              ]
            });

            // Add event listeners after dialog is created
            setTimeout(() => {
              document.querySelectorAll('.help-menu-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                  const action = e.currentTarget.dataset.action;
                  helpDialog.remove(); // Close the dialog

                  setTimeout(() => {
                    if (action === 'tour') {
                      startGuidedTour();
                    } else if (action === 'industry') {
                      showIndustrySelector();
                    } else if (action === 'tooltips') {
                      showContextualHelp();
                    }
                  }, 100);
                });
              });
            }, 100);

            document.body.appendChild(helpDialog);
          }

          function initializeContextualTooltips() {
            // Add tooltips to key elements
            const tooltipElements = [
              { selector: '#employees', content: 'Set the number of full-time employees in your business' },
              { selector: '#employeePay', content: 'Average annual salary per employee including benefits' },
              { selector: '.offering-card .btn.danger', content: 'Remove this service offering from your business model' },
              { selector: '#scenariosBtn', content: 'Save current configuration or load previous scenarios' },
              { selector: '#shareBtn', content: 'Generate shareable link for stakeholders' },
              { selector: '.settings-cog-btn', content: 'Customize experience level and advanced features' }
            ];

            tooltipElements.forEach(({ selector, content }) => {
              const element = document.querySelector(selector);
              if (element) {
                element.title = content; // Basic tooltip
              }
            });
          }

          function showContextualHelp() {
            // Enable enhanced tooltips
            const tooltipElements = document.querySelectorAll('[title]');
            tooltipElements.forEach(el => {
              if (!el.dataset.tooltipEnabled) {
                el.dataset.originalTitle = el.title;
                el.dataset.tooltipEnabled = 'true';
                el.title = ''; // Remove basic tooltip

                el.addEventListener('mouseenter', showEnhancedTooltip);
                el.addEventListener('mouseleave', hideEnhancedTooltip);
              }
            });

            // Update settings to reflect tooltips are enabled
            if (updateSetting) {
              updateSetting('showTooltips', true);
            }

            // Show confirmation
            const notification = document.createElement('div');
            notification.textContent = 'Contextual tooltips enabled! Hover over elements to see help.';
            notification.style.cssText = 'position: fixed;top: 20px;left: 50%;transform: translateX(-50%);background: var(--accent, #007bff);color: white;padding: 10px 20px;border-radius: 6px;z-index: 10002;font-size: 14px;';
            document.body.appendChild(notification);
            setTimeout(() => notification.remove(), 3000);
          }

          function showEnhancedTooltip(e) {
            const content = e.target.dataset.originalTitle;
            if (!content) return;

            const tooltip = document.createElement('div');
            tooltip.className = 'enhanced-tooltip';
            tooltip.textContent = content;
            tooltip.style.cssText = 'position: fixed;background: #333;color: white;padding: 8px 12px;border-radius: 4px;font-size: 12px;z-index: 10002;pointer-events: none;max-width: 200px;word-wrap: break-word;';

            document.body.appendChild(tooltip);

            const rect = e.target.getBoundingClientRect();
            tooltip.style.left = (rect.left + rect.width / 2) + 'px';
            tooltip.style.top = (rect.top - 8) + 'px';
            tooltip.style.transform = 'translate(-50%, -100%)';

            e.target._tooltip = tooltip;
          }

          function hideEnhancedTooltip(e) {
            if (e.target._tooltip) {
              e.target._tooltip.remove();
              delete e.target._tooltip;
            }
          }

          // Make functions global
          window.getAllScenarios = getAllScenarios;
          window.saveScenario = saveScenario;
          window.renderScenariosList = renderScenariosList;
          window.loadScenario = loadScenario;
          window.deleteScenario = deleteScenario;
          window.openScenarioModal = openScenarioModal;
          window.closeScenarioModal = closeScenarioModal;
          window.encodeScenarioToURL = encodeScenarioToURL;
          window.decodeScenarioFromURL = decodeScenarioFromURL;
          window.loadScenarioFromURL = loadScenarioFromURL;

          // Initialize scenarios event listeners
          function initializeScenarios() {
            // Set up scenarios button
            const scenariosBtn = document.getElementById('scenariosBtn');
            if (scenariosBtn) {
              scenariosBtn.addEventListener('click', openScenarioModal);
            }

            // Set up modal close button
            const modalCloseBtn = document.querySelector('#scenariosModal .modal-close');
            if (modalCloseBtn) {
              modalCloseBtn.addEventListener('click', closeScenarioModal);
            }

            // Set up save button
            const saveBtn = document.getElementById('saveScenarioBtn');
            if (saveBtn) {
              saveBtn.addEventListener('click', () => {
                const input = document.getElementById('scenarioNameInput');
                if (input) {
                  saveScenario(input.value);
                }
              });
            }

            // Set up input enter key
            const input = document.getElementById('scenarioNameInput');
            if (input) {
              input.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                  saveScenario(input.value);
                }
              });
            }

            // Delegate events for load and delete buttons
            const scenariosList = document.getElementById('scenariosList');
            if (scenariosList) {
              scenariosList.addEventListener('click', (e) => {
                const target = e.target;
                const scenarioId = target.dataset.scenarioId;

                if (target.classList.contains('load-btn') && scenarioId) {
                  loadScenario(scenarioId);
                } else if (target.classList.contains('delete-btn') && scenarioId) {
                  // Use custom confirmation modal instead of native confirm
                  showDeleteConfirmation(scenarioId, () => {
                    deleteScenario(scenarioId);
                    renderScenariosList();
                  });
                }
              });
            }
          }

          // Custom confirmation dialog for scenario deletion
          function showDeleteConfirmation(scenarioId, onConfirm) {
            const modal = document.createElement('div');
            modal.className = 'modal-overlay';
            modal.style.cssText = 'position: fixed;top: 0;left: 0;right: 0;bottom: 0;background: rgba(0, 0, 0, 0.6);display: flex;align-items: center;justify-content: center;z-index: 10001;';

            const content = document.createElement('div');
            content.className = 'modal-content';
            content.style.cssText = 'background: white;padding: 24px;border-radius: 8px;max-width: 400px;text-align: center;';
            content.innerHTML = '<div class="modal-header"><h3>Confirm Delete</h3><button class="modal-close" onclick="this.closest(\'modal-overlay\').remove()">&times;</button></div><div class="modal-body"><p>Are you sure you want to delete this scenario? This action cannot be undone.</p></div><div class="modal-footer"><button class="btn secondary" onclick="this.closest(\'modal-overlay\').remove()">Cancel</button><button class="btn danger" onclick="this.closest(\'modal-overlay\').remove(); setTimeout(() => { onConfirm(); }, 100)">Delete</button></div>';

            modal.appendChild(content);
            document.body.appendChild(modal);

            // Auto-close on overlay click
            modal.addEventListener('click', (e) => {
              if (e.target === modal) {
                modal.remove();
              }
            });
          }

          // Delegate events for load and delete buttons
          const scenariosList = document.getElementById('scenariosList');
          if (scenariosList) {
            scenariosList.addEventListener('click', (e) => {
              const target = e.target;
              const scenarioId = target.dataset.scenarioId;

              if (target.classList.contains('load-btn') && scenarioId) {
                loadScenario(scenarioId);
              } else if (target.classList.contains('delete-btn') && scenarioId) {
                // Use custom confirmation modal instead of native confirm
                showDeleteConfirmation(scenarioId, () => {
                  deleteScenario(scenarioId);
                  renderScenariosList();

                  if (userLevel === 'beginner') {
                    advancedElements.forEach(el => el.style.display = 'none');
                    expertElements.forEach(el => el.style.display = 'none');
                  } else if (userLevel === 'intermediate') {
                    expertElements.forEach(el => el.style.display = 'none');
                  }

                  // Always show all export options regardless of user level
                  document.querySelectorAll('.export-option.advanced-feature, .export-option.expert-feature, .mobile-submenu-btn.expert-feature').forEach(el => {
                    el.style.display = 'block';
                  });

                  // Special handling for debug panel-show if user has enabled it regardless of level
                  const showDebugPanel = localStorage.getItem('showDebugPanel') === 'true';
                  if (showDebugPanel) {
                    document.querySelectorAll('.debug-wrapper.expert-feature').forEach(el => {
                      el.style.display = 'block';
                    });
                  }
                });
              }
            });
          }

          // Initialize scenarios when DOM is ready
          initializeScenarios();

          // Initialize progressive disclosure when DOM is ready
          function initializeProgressiveDisclosure() {
            const userLevel = localStorage.getItem('userExperienceLevel') || 'beginner';

            const advancedElements = document.querySelectorAll('.advanced-feature:not(.export-option)');
            const expertElements = document.querySelectorAll('.expert-feature:not(.export-option)');

            if (userLevel === 'beginner') {
              advancedElements.forEach(el => el.style.display = 'none');
              expertElements.forEach(el => el.style.display = 'none');
            } else if (userLevel === 'intermediate') {
              expertElements.forEach(el => el.style.display = 'none');
            }

            // Always show all export options regardless of user level
            document.querySelectorAll('.export-option.advanced-feature, .export-option.expert-feature, .mobile-submenu-btn.expert-feature').forEach(el => {
              el.style.display = 'block';
            });

            // Special handling for debug panel-show if user has enabled it regardless of level
            const showDebugPanel = localStorage.getItem('showDebugPanel') === 'true';
            if (showDebugPanel) {
              document.querySelectorAll('.debug-wrapper.expert-feature').forEach(el => {
                el.style.display = 'block';
              });
            }
          }

          // Make functions global
          window.getAllScenarios = getAllScenarios;
          window.saveScenario = saveScenario;
          window.renderScenariosList = renderScenariosList;
          window.loadScenario = loadScenario;
          window.deleteScenario = deleteScenario;
          window.openScenarioModal = openScenarioModal;
          window.closeScenarioModal = closeScenarioModal;
          window.encodeScenarioToURL = encodeScenarioToURL;
          window.decodeScenarioFromURL = decodeScenarioFromURL;
          window.loadScenarioFromURL = loadScenarioFromURL;

          // Initialize scenarios event listeners
          function initializeScenarios() {
            // Set up scenarios button
            const scenariosBtn = document.getElementById('scenariosBtn');
            if (scenariosBtn) {
              scenariosBtn.addEventListener('click', openScenarioModal);
            }

            // Set up modal close button
            const modalCloseBtn = document.querySelector('#scenariosModal .modal-close');
            if (modalCloseBtn) {
              modalCloseBtn.addEventListener('click', closeScenarioModal);
            }

            // Set up save button
            const saveBtn = document.getElementById('saveScenarioBtn');
            if (saveBtn) {
              saveBtn.addEventListener('click', () => {
                const input = document.getElementById('scenarioNameInput');
                if (input) {
                  saveScenario(input.value);
                }
              });
            }

            // Set up input enter key
            const input = document.getElementById('scenarioNameInput');
            if (input) {
              input.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                  saveScenario(input.value);
                }
              });
            }

            // Delegate events for load and delete buttons
            const scenariosList = document.getElementById('scenariosList');
            if (scenariosList) {
              scenariosList.addEventListener('click', (e) => {
                const target = e.target;
                const scenarioId = target.dataset.scenarioId;

                if (target.classList.contains('load-btn') && scenarioId) {
                  loadScenario(scenarioId);
                } else if (target.classList.contains('delete-btn') && scenarioId) {
                  // Use custom confirmation modal instead of native confirm
                  showDeleteConfirmation(scenarioId, () => {
                    deleteScenario(scenarioId);
                    renderScenariosList();
                  });
                }
              });
            }
          }

          // Custom confirmation dialog for scenario deletion
          function showDeleteConfirmation(scenarioId, onConfirm) {
            const modal = document.createElement('div');
            modal.className = 'modal-overlay';
            modal.style.cssText = 'position: fixed;top: 0;left: 0;right: 0;bottom: 0;background: rgba(0, 0, 0, 0.6);display: flex;align-items: center;justify-content: center;z-index: 10001;';

            const content = document.createElement('div');
            content.className = 'modal-content';
            content.style.cssText = 'background: white;padding: 24px;border-radius: 8px;max-width: 400px;text-align: center;';
            content.innerHTML = '<div class="modal-header"><h3>Confirm Delete</h3><button class="modal-close" onclick="this.closest(\'modal-overlay\').remove()">&times;</button></div><div class="modal-body"><p>Are you sure you want to delete this scenario? This action cannot be undone.</p></div><div class="modal-footer"><button class="btn secondary" onclick="this.closest(\'modal-overlay\').remove()">Cancel</button><button class="btn danger" onclick="this.closest(\'modal-overlay\').remove(); setTimeout(() => { onConfirm(); }, 100)">Delete</button></div>';

            modal.appendChild(content);
            document.body.appendChild(modal);

            // Auto-close on overlay click
            modal.addEventListener('click', (e) => {
              if (e.target === modal) {
                modal.remove();
              }
            });
          }

          // Delegate events for load and delete buttons
          if (scenariosList) {
            scenariosList.addEventListener('click', (e) => {
              const target = e.target;
              const scenarioId = target.dataset.scenarioId;

              if (target.classList.contains('load-btn') && scenarioId) {
                loadScenario(scenarioId);
              } else if (target.classList.contains('delete-btn') && scenarioId) {
                // Use custom confirmation modal instead of native confirm
                showDeleteConfirmation(scenarioId, () => {
                  deleteScenario(scenarioId);
                  renderScenariosList();

                  if (userLevel === 'beginner') {
                    advancedElements.forEach(el => el.style.display = 'none');
                    expertElements.forEach(el => el.style.display = 'none');
                  } else if (userLevel === 'intermediate') {
                    expertElements.forEach(el => el.style.display = 'none');
                  }

                  // Always show all export options regardless of user level
                  document.querySelectorAll('.export-option.advanced-feature, .export-option.expert-feature, .mobile-submenu-btn.expert-feature').forEach(el => {
                    el.style.display = 'block';
                  });

                  // Special handling for debug panel-show if user has enabled it regardless of level
                  const showDebugPanel = localStorage.getItem('showDebugPanel') === 'true';
                  if (showDebugPanel) {
                    document.querySelectorAll('.debug-wrapper.expert-feature').forEach(el => {
                      el.style.display = 'block';
                    });
                  }
                });
              }
            });
          }

          // Initialize scenarios when DOM is ready
          initializeScenarios();

initializeProgressiveDisclosure();
initializeProgressiveDisclosure();
initializeProgressiveDisclosure();
))
}}}}