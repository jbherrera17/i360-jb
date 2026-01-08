/**
 * Insight 360 - Onboarding Wizard
 * Multi-step modal wizard for first-time user onboarding
 *
 * Features:
 * - Welcome screen
 * - Profile setup (name, avatar, department)
 * - Feature tour (agents, workflows, context assets)
 * - First workflow prompt
 * - Completion celebration
 *
 * Usage:
 * - Auto-shows on first login if onboarding not completed
 * - Can be triggered manually via OnboardingWizard.show()
 * - State persisted to /api/onboarding/state
 */

const OnboardingWizard = (function() {
    // State
    let currentStep = 0;
    let onboardingState = null;
    let departments = [];
    let profileData = null;
    let isVisible = false;

    // Avatar emoji options
    const avatarEmojis = ['😀', '😎', '🤓', '🧑‍💻', '👨‍💼', '👩‍💼', '🦸', '🧙', '🎯', '🚀', '💡', '⭐'];

    // Step definitions
    const steps = [
        {
            id: 'welcome',
            title: 'Welcome to Insight 360',
            icon: 'sparkles'
        },
        {
            id: 'profile',
            title: 'Set Up Your Profile',
            icon: 'user'
        },
        {
            id: 'tour',
            title: 'Discover Key Features',
            icon: 'compass'
        },
        {
            id: 'execute120',
            title: 'Execute 120',
            icon: 'rocket'
        },
        {
            id: 'complete',
            title: 'You\'re All Set!',
            icon: 'check-circle'
        }
    ];

    // CSS Styles
    const styles = `
        .onboarding-overlay {
            position: fixed;
            inset: 0;
            background: rgba(0, 0, 0, 0.8);
            z-index: 10000;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 2rem;
            opacity: 0;
            visibility: hidden;
            transition: all 0.3s;
        }

        .onboarding-overlay.visible {
            opacity: 1;
            visibility: visible;
        }

        .onboarding-modal {
            background: var(--bg-secondary);
            border-radius: 16px;
            width: 100%;
            max-width: 600px;
            max-height: 90vh;
            overflow: hidden;
            display: flex;
            flex-direction: column;
            transform: scale(0.9);
            transition: transform 0.3s;
        }

        .onboarding-overlay.visible .onboarding-modal {
            transform: scale(1);
        }

        .onboarding-header {
            padding: 1.5rem;
            border-bottom: 1px solid var(--border);
            display: flex;
            align-items: center;
            justify-content: space-between;
        }

        .onboarding-title {
            display: flex;
            align-items: center;
            gap: 0.75rem;
            font-size: 1.25rem;
            font-weight: 600;
            margin: 0;
        }

        .onboarding-title-icon {
            width: 32px;
            height: 32px;
            border-radius: 8px;
            background: linear-gradient(135deg, var(--primary), var(--secondary));
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
        }

        .onboarding-close {
            background: none;
            border: none;
            color: var(--text-muted);
            cursor: pointer;
            padding: 0.5rem;
            border-radius: 6px;
            transition: all 0.2s;
        }

        .onboarding-close:hover {
            background: var(--bg-tertiary);
            color: var(--text-primary);
        }

        .onboarding-progress {
            display: flex;
            align-items: center;
            padding: 1rem 1.5rem;
            gap: 0.5rem;
            background: var(--bg-tertiary);
        }

        .onboarding-step-dot {
            width: 10px;
            height: 10px;
            border-radius: 50%;
            background: var(--border);
            transition: all 0.3s;
        }

        .onboarding-step-dot.active {
            background: var(--primary);
            width: 24px;
            border-radius: 5px;
        }

        .onboarding-step-dot.completed {
            background: #10b981;
        }

        .onboarding-step-line {
            flex: 1;
            height: 2px;
            background: var(--border);
        }

        .onboarding-step-line.completed {
            background: #10b981;
        }

        .onboarding-body {
            flex: 1;
            overflow-y: auto;
            padding: 2rem;
        }

        .onboarding-step {
            display: none;
        }

        .onboarding-step.active {
            display: block;
            animation: fadeIn 0.3s;
        }

        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
        }

        .onboarding-footer {
            padding: 1rem 1.5rem;
            border-top: 1px solid var(--border);
            display: flex;
            align-items: center;
            justify-content: space-between;
        }

        .onboarding-btn {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            padding: 0.75rem 1.5rem;
            border-radius: 8px;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.2s;
        }

        .onboarding-btn-secondary {
            background: transparent;
            border: 1px solid var(--border);
            color: var(--text-secondary);
        }

        .onboarding-btn-secondary:hover {
            border-color: var(--text-muted);
        }

        .onboarding-btn-primary {
            background: var(--primary);
            border: 1px solid var(--primary);
            color: white;
        }

        .onboarding-btn-primary:hover {
            opacity: 0.9;
        }

        .onboarding-btn-skip {
            background: none;
            border: none;
            color: var(--text-muted);
            font-size: 0.85rem;
            cursor: pointer;
        }

        .onboarding-btn-skip:hover {
            color: var(--text-secondary);
        }

        /* Welcome Step */
        .welcome-content {
            text-align: center;
        }

        .welcome-icon {
            width: 80px;
            height: 80px;
            margin: 0 auto 1.5rem;
            border-radius: 20px;
            background: linear-gradient(135deg, var(--primary), var(--secondary));
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
        }

        .welcome-icon i {
            width: 40px;
            height: 40px;
        }

        .welcome-heading {
            font-family: 'Orbitron', sans-serif;
            font-size: 1.75rem;
            margin: 0 0 1rem;
        }

        .welcome-text {
            color: var(--text-secondary);
            line-height: 1.6;
            max-width: 400px;
            margin: 0 auto;
        }

        /* Profile Step */
        .profile-form {
            display: flex;
            flex-direction: column;
            gap: 1.5rem;
        }

        .profile-avatar-section {
            display: flex;
            align-items: center;
            gap: 1.5rem;
        }

        .profile-avatar-display {
            width: 80px;
            height: 80px;
            border-radius: 50%;
            background: linear-gradient(135deg, var(--primary), var(--secondary));
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 2rem;
            color: white;
            flex-shrink: 0;
        }

        .profile-avatar-picker {
            display: flex;
            flex-wrap: wrap;
            gap: 0.5rem;
        }

        .profile-avatar-option {
            width: 40px;
            height: 40px;
            border-radius: 8px;
            border: 2px solid var(--border);
            background: var(--bg-tertiary);
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 1.25rem;
            cursor: pointer;
            transition: all 0.2s;
        }

        .profile-avatar-option:hover {
            border-color: var(--primary);
        }

        .profile-avatar-option.selected {
            border-color: var(--primary);
            background: rgba(99, 102, 241, 0.2);
        }

        .profile-field {
            display: flex;
            flex-direction: column;
            gap: 0.5rem;
        }

        .profile-label {
            font-weight: 500;
            font-size: 0.9rem;
        }

        .profile-input,
        .profile-select {
            padding: 0.75rem 1rem;
            background: var(--bg-tertiary);
            border: 1px solid var(--border);
            border-radius: 8px;
            font-size: 0.95rem;
            color: var(--text-primary);
        }

        .profile-input:focus,
        .profile-select:focus {
            outline: none;
            border-color: var(--primary);
        }

        /* Tour Step */
        .tour-features {
            display: flex;
            flex-direction: column;
            gap: 1rem;
        }

        .tour-feature {
            display: flex;
            align-items: flex-start;
            gap: 1rem;
            padding: 1rem;
            background: var(--bg-tertiary);
            border-radius: 12px;
            cursor: pointer;
            transition: all 0.2s;
            border: 1px solid transparent;
        }

        .tour-feature:hover {
            border-color: var(--primary);
            transform: translateX(4px);
        }

        .tour-feature-icon {
            width: 48px;
            height: 48px;
            border-radius: 12px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            flex-shrink: 0;
        }

        .tour-feature-content {
            flex: 1;
        }

        .tour-feature-title {
            font-weight: 600;
            margin-bottom: 0.25rem;
        }

        .tour-feature-desc {
            font-size: 0.9rem;
            color: var(--text-secondary);
        }

        /* Workflow Step */
        .workflow-intro {
            text-align: center;
            margin-bottom: 1.5rem;
        }

        .workflow-intro p {
            color: var(--text-secondary);
        }

        .workflow-suggestions {
            display: flex;
            flex-direction: column;
            gap: 0.75rem;
        }

        .workflow-suggestion {
            display: flex;
            align-items: center;
            gap: 1rem;
            padding: 1rem;
            background: var(--bg-tertiary);
            border-radius: 12px;
            cursor: pointer;
            transition: all 0.2s;
            border: 1px solid transparent;
        }

        .workflow-suggestion:hover {
            border-color: var(--primary);
        }

        .workflow-suggestion-icon {
            width: 40px;
            height: 40px;
            border-radius: 10px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
        }

        .workflow-suggestion-info {
            flex: 1;
        }

        .workflow-suggestion-name {
            font-weight: 500;
        }

        .workflow-suggestion-meta {
            font-size: 0.8rem;
            color: var(--text-muted);
        }

        /* Complete Step */
        .complete-content {
            text-align: center;
        }

        .complete-icon {
            width: 100px;
            height: 100px;
            margin: 0 auto 1.5rem;
            border-radius: 50%;
            background: linear-gradient(135deg, #10b981, #059669);
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            animation: pulse 2s infinite;
        }

        @keyframes pulse {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.05); }
        }

        .complete-icon i {
            width: 50px;
            height: 50px;
        }

        .complete-heading {
            font-family: 'Orbitron', sans-serif;
            font-size: 1.5rem;
            margin: 0 0 1rem;
        }

        .complete-text {
            color: var(--text-secondary);
            margin-bottom: 1.5rem;
        }

        .complete-actions {
            display: flex;
            flex-wrap: wrap;
            justify-content: center;
            gap: 1rem;
        }

        .complete-action {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            padding: 0.75rem 1.25rem;
            background: var(--bg-tertiary);
            border-radius: 8px;
            color: var(--text-primary);
            text-decoration: none;
            transition: all 0.2s;
        }

        .complete-action:hover {
            background: var(--primary);
            color: white;
        }
    `;

    // Inject styles
    function injectStyles() {
        if (document.getElementById('onboarding-wizard-styles')) return;

        const styleEl = document.createElement('style');
        styleEl.id = 'onboarding-wizard-styles';
        styleEl.textContent = styles;
        document.head.appendChild(styleEl);
    }

    // Create modal HTML
    function createModal() {
        // Remove existing modal to ensure fresh state
        const existing = document.getElementById('onboardingWizard');
        if (existing) {
            existing.remove();
        }

        const modal = document.createElement('div');
        modal.id = 'onboardingWizard';
        modal.className = 'onboarding-overlay';
        modal.innerHTML = `
            <div class="onboarding-modal">
                <div class="onboarding-header">
                    <h2 class="onboarding-title">
                        <div class="onboarding-title-icon">
                            <i data-lucide="sparkles"></i>
                        </div>
                        <span id="onboardingStepTitle">Welcome</span>
                    </h2>
                    <button class="onboarding-close" onclick="OnboardingWizard.dismiss()">
                        <i data-lucide="x"></i>
                    </button>
                </div>
                <div class="onboarding-progress" id="onboardingProgress"></div>
                <div class="onboarding-body" id="onboardingBody"></div>
                <div class="onboarding-footer">
                    <button class="onboarding-btn-skip" onclick="OnboardingWizard.skip()">Skip for now</button>
                    <div style="display: flex; gap: 0.75rem;">
                        <button class="onboarding-btn onboarding-btn-secondary" id="onboardingPrev" onclick="OnboardingWizard.prev()">
                            <i data-lucide="arrow-left"></i> Back
                        </button>
                        <button class="onboarding-btn onboarding-btn-primary" id="onboardingNext" onclick="OnboardingWizard.next()">
                            Next <i data-lucide="arrow-right"></i>
                        </button>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
    }

    // Get auth token
    function getAuthToken() {
        const cookies = document.cookie.split(';');
        for (const cookie of cookies) {
            const [name, value] = cookie.trim().split('=');
            if (name === 'auth_token') return value;
        }
        return localStorage.getItem('insight360_token');
    }

    // Fetch onboarding state
    async function fetchState() {
        try {
            const token = getAuthToken();
            const response = await fetch('/api/onboarding/state', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const result = await response.json();
            if (result.success) {
                onboardingState = result.data;
            }
        } catch (error) {
            console.error('Error fetching onboarding state:', error);
        }
    }

    // Update onboarding state
    async function updateState(updates) {
        try {
            const token = getAuthToken();
            await fetch('/api/onboarding/state', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(updates)
            });
        } catch (error) {
            console.error('Error updating onboarding state:', error);
        }
    }

    // Fetch departments
    async function fetchDepartments() {
        try {
            const response = await fetch('/api/execute120/departments');
            const result = await response.json();
            if (result.success) {
                departments = result.data;
            }
        } catch (error) {
            console.error('Error fetching departments:', error);
        }
    }

    // Fetch profile from database (same as profile.html)
    async function fetchProfile() {
        try {
            const token = getAuthToken();
            const response = await fetch('/api/auth/profile', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const result = await response.json();
            if (result.success) {
                profileData = result.data;
            }
        } catch (error) {
            console.error('Error fetching profile:', error);
        }
    }

    // Render progress dots
    function renderProgress() {
        const container = document.getElementById('onboardingProgress');
        container.innerHTML = steps.map((step, index) => `
            ${index > 0 ? `<div class="onboarding-step-line ${index <= currentStep ? 'completed' : ''}"></div>` : ''}
            <div class="onboarding-step-dot ${index === currentStep ? 'active' : ''} ${index < currentStep ? 'completed' : ''}"></div>
        `).join('');
    }

    // Render current step content
    function renderStep() {
        const step = steps[currentStep];
        const container = document.getElementById('onboardingBody');
        const titleEl = document.getElementById('onboardingStepTitle');
        const titleIcon = document.querySelector('.onboarding-title-icon i');

        if (!container || !titleEl) {
            console.error('Onboarding: DOM elements not found');
            return;
        }

        console.log('Rendering step:', currentStep, step.id, step.title);

        titleEl.textContent = step.title;
        if (titleIcon) {
            titleIcon.setAttribute('data-lucide', step.icon);
        }

        let content = '';

        switch (step.id) {
            case 'welcome':
                content = renderWelcomeStep();
                break;
            case 'profile':
                content = renderProfileStep();
                break;
            case 'tour':
                content = renderTourStep();
                break;
            case 'execute120':
                content = renderExecute120Step();
                break;
            case 'complete':
                content = renderCompleteStep();
                break;
            default:
                console.error('Unknown step id:', step.id);
                content = renderWelcomeStep();
        }

        container.innerHTML = `<div class="onboarding-step active">${content}</div>`;

        // Update buttons
        const prevBtn = document.getElementById('onboardingPrev');
        const nextBtn = document.getElementById('onboardingNext');

        prevBtn.style.display = currentStep > 0 && currentStep < steps.length - 1 ? 'flex' : 'none';

        if (currentStep === steps.length - 1) {
            nextBtn.innerHTML = 'Get Started <i data-lucide="arrow-right"></i>';
        } else {
            nextBtn.innerHTML = 'Next <i data-lucide="arrow-right"></i>';
        }

        // Re-render Lucide icons
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
    }

    // Welcome step
    function renderWelcomeStep() {
        return `
            <div class="welcome-content">
                <div class="welcome-icon">
                    <i data-lucide="rocket"></i>
                </div>
                <h3 class="welcome-heading">Welcome to Insight 360</h3>
                <p class="welcome-text">
                    Your AI-powered command center for values-based decision making.
                    Let's take a quick tour to help you get started.
                </p>
            </div>
        `;
    }

    // Profile step - uses profileData fetched from database
    function renderProfileStep() {
        // Use profile data from database (fetched in show()), fall back to localStorage
        const user = profileData || JSON.parse(localStorage.getItem('insight360_user') || '{}');
        const deptOptions = departments.map(d => `
            <option value="${d.id}" ${user.department_id === d.id ? 'selected' : ''}>${d.name}</option>
        `).join('');

        return `
            <div class="profile-form">
                <div class="profile-avatar-section">
                    <div class="profile-avatar-display" id="wizardAvatarDisplay">
                        ${user.avatar_url || user.display_name?.charAt(0) || '?'}
                    </div>
                    <div>
                        <label class="profile-label">Choose an avatar</label>
                        <div class="profile-avatar-picker">
                            ${avatarEmojis.map(e => `
                                <div class="profile-avatar-option ${user.avatar_url === e ? 'selected' : ''}"
                                     onclick="OnboardingWizard.selectAvatar('${e}')">${e}</div>
                            `).join('')}
                        </div>
                    </div>
                </div>
                <div class="profile-field">
                    <label class="profile-label">Display Name</label>
                    <input type="text" class="profile-input" id="wizardDisplayName"
                           value="${user.display_name || ''}" placeholder="Enter your name">
                </div>
                <div class="profile-field">
                    <label class="profile-label">Department</label>
                    <select class="profile-select" id="wizardDepartment">
                        <option value="">Select a department...</option>
                        ${deptOptions}
                    </select>
                </div>
            </div>
        `;
    }

    // Tour step
    function renderTourStep() {
        const features = [
            {
                icon: 'database',
                color: '#10b981',
                title: 'Context Assets',
                desc: 'Reusable knowledge that powers your AI agents',
                href: '/context.html',
                helpFile: '/api/docs/context-user-guide.md'
            },
            {
                icon: 'bot',
                color: '#6366f1',
                title: 'Agent Library',
                desc: 'Specialized AI agents trained for specific tasks',
                href: '/agents.html',
                helpFile: '/api/docs/agents-user-guide.md'
            },
            {
                icon: 'git-branch',
                color: '#ec4899',
                title: 'Workflows',
                desc: 'Build and run multi-step automated workflows',
                href: '/workflow-builder.html',
                helpFile: '/api/docs/workflow-user-guide.md'
            }
        ];

        return `
            <div class="tour-features">
                ${features.map(f => `
                    <div class="tour-feature" onclick="OnboardingWizard.navigateWithHelp('${f.href}', '${f.helpFile}')">
                        <div class="tour-feature-icon" style="background: ${f.color}">
                            <i data-lucide="${f.icon}"></i>
                        </div>
                        <div class="tour-feature-content">
                            <div class="tour-feature-title">${f.title}</div>
                            <div class="tour-feature-desc">${f.desc}</div>
                        </div>
                        <i data-lucide="arrow-right" style="color: var(--text-muted);"></i>
                    </div>
                `).join('')}
            </div>
        `;
    }

    // Execute 120 step
    function renderExecute120Step() {
        return `
            <div class="execute120-intro">
                <div class="execute120-icon" style="width: 64px; height: 64px; margin: 0 auto 1.5rem; border-radius: 16px; background: linear-gradient(135deg, #6366f1, #8b5cf6); display: flex; align-items: center; justify-content: center; color: white;">
                    <i data-lucide="rocket" style="width: 32px; height: 32px;"></i>
                </div>
                <h3 style="text-align: center; margin-bottom: 1rem; font-size: 1.25rem;">Your AI Execution Hub</h3>
                <p style="text-align: center; color: var(--text-secondary); margin-bottom: 1.5rem; line-height: 1.6;">
                    Execute 120 is where the magic happens. Run pre-built workflows,
                    leverage AI agents, and accomplish complex tasks with guided step-by-step execution.
                </p>
                <div style="background: var(--bg-tertiary); border-radius: 12px; padding: 1.25rem; margin-bottom: 1rem;">
                    <div style="display: flex; flex-direction: column; gap: 0.75rem;">
                        <div style="display: flex; align-items: center; gap: 0.75rem;">
                            <i data-lucide="check-circle" style="color: #10b981; width: 18px; height: 18px;"></i>
                            <span style="font-size: 0.95rem;">Run workflows with AI-powered assistance</span>
                        </div>
                        <div style="display: flex; align-items: center; gap: 0.75rem;">
                            <i data-lucide="check-circle" style="color: #10b981; width: 18px; height: 18px;"></i>
                            <span style="font-size: 0.95rem;">Get guided through complex multi-step tasks</span>
                        </div>
                        <div style="display: flex; align-items: center; gap: 0.75rem;">
                            <i data-lucide="check-circle" style="color: #10b981; width: 18px; height: 18px;"></i>
                            <span style="font-size: 0.95rem;">Generate deliverables in minutes, not hours</span>
                        </div>
                    </div>
                </div>
                <button class="onboarding-btn onboarding-btn-primary" style="width: 100%; justify-content: center;" onclick="OnboardingWizard.navigateWithHelp('/execute120.html', '/api/docs/execute120-user-guide.md')">
                    <i data-lucide="external-link"></i>
                    Explore Execute 120
                </button>
            </div>
        `;
    }

    // Complete step
    function renderCompleteStep() {
        return `
            <div class="complete-content">
                <div class="complete-icon">
                    <i data-lucide="check"></i>
                </div>
                <h3 class="complete-heading">You're All Set!</h3>
                <p class="complete-text">
                    You're ready to start using Insight 360.<br>
                    Here are some quick actions to get you going:
                </p>
                <div class="complete-actions">
                    <a href="/chat.html" class="complete-action">
                        <i data-lucide="message-square"></i> Start a Chat
                    </a>
                    <a href="/agents.html" class="complete-action">
                        <i data-lucide="bot"></i> Browse Agents
                    </a>
                    <a href="/execute120.html" class="complete-action">
                        <i data-lucide="rocket"></i> Execute 120
                    </a>
                </div>
            </div>
        `;
    }

    // Select avatar
    function selectAvatar(emoji) {
        document.querySelectorAll('.profile-avatar-option').forEach(opt => {
            opt.classList.toggle('selected', opt.textContent === emoji);
        });
        document.getElementById('wizardAvatarDisplay').textContent = emoji;
    }

    // Save profile from wizard
    async function saveProfileFromWizard() {
        const displayName = document.getElementById('wizardDisplayName')?.value;
        const department = document.getElementById('wizardDepartment')?.value;
        const selectedAvatar = document.querySelector('.profile-avatar-option.selected')?.textContent;

        if (displayName || department || selectedAvatar) {
            try {
                const token = getAuthToken();
                const updates = {};
                if (displayName) updates.display_name = displayName;
                if (department) updates.department_id = department;
                if (selectedAvatar) updates.avatar_url = selectedAvatar;

                await fetch('/api/auth/profile', {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify(updates)
                });

                // Update localStorage
                const user = JSON.parse(localStorage.getItem('insight360_user') || '{}');
                Object.assign(user, updates);
                localStorage.setItem('insight360_user', JSON.stringify(user));

                // Mark profile as completed
                await updateState({ profile_completed: true });
            } catch (error) {
                console.error('Error saving profile:', error);
            }
        }
    }

    // Navigate to page and open help modal
    function navigateWithHelp(href, helpFile) {
        hide();
        // Store the help file to open after navigation
        sessionStorage.setItem('insight360_open_help', helpFile);
        window.location.href = href;
    }

    // Next step
    async function next() {
        // Save profile if on profile step
        if (steps[currentStep].id === 'profile') {
            await saveProfileFromWizard();
        }

        // Mark tour as completed
        if (steps[currentStep].id === 'tour') {
            await updateState({ tour_completed: true });
        }

        if (currentStep < steps.length - 1) {
            currentStep++;
            await updateState({ current_step: currentStep, status: 'in_progress' });
            renderProgress();
            renderStep();
        } else {
            await complete();
        }
    }

    // Previous step
    function prev() {
        if (currentStep > 0) {
            currentStep--;
            renderProgress();
            renderStep();
        }
    }

    // Skip onboarding
    async function skip() {
        try {
            const token = getAuthToken();
            await fetch('/api/onboarding/skip', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            hide();
        } catch (error) {
            console.error('Error skipping onboarding:', error);
            hide();
        }
    }

    // Dismiss (resume later)
    async function dismiss() {
        try {
            const token = getAuthToken();
            await fetch('/api/onboarding/dismiss', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            hide();
        } catch (error) {
            console.error('Error dismissing onboarding:', error);
            hide();
        }
    }

    // Complete onboarding
    async function complete() {
        try {
            const token = getAuthToken();
            await fetch('/api/onboarding/complete', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            hide();
        } catch (error) {
            console.error('Error completing onboarding:', error);
            hide();
        }
    }

    // Show wizard
    async function show() {
        injectStyles();
        createModal();

        await fetchState();
        await fetchDepartments();
        await fetchProfile();

        // Determine starting step
        if (onboardingState && onboardingState.current_step > 0) {
            currentStep = Math.min(onboardingState.current_step, steps.length - 1);
        } else {
            currentStep = 0;
        }

        renderProgress();
        renderStep();

        const overlay = document.getElementById('onboardingWizard');
        overlay.classList.add('visible');
        isVisible = true;

        // Mark as in progress
        if (!onboardingState || onboardingState.status === 'not_started') {
            await updateState({ status: 'in_progress', started_at: new Date().toISOString() });
        }

        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
    }

    // Hide wizard
    function hide() {
        const overlay = document.getElementById('onboardingWizard');
        if (overlay) {
            overlay.classList.remove('visible');
        }
        isVisible = false;
    }

    // Check if should show
    async function checkAndShow() {
        await fetchState();

        if (!onboardingState ||
            (onboardingState.status !== 'completed' && onboardingState.status !== 'skipped')) {
            // Check URL param
            const params = new URLSearchParams(window.location.search);
            if (params.get('onboarding') === 'true') {
                await show();
                return;
            }

            // Show if first time
            if (!onboardingState || onboardingState.status === 'not_started') {
                await show();
            }
        }
    }

    // Public API
    return {
        show,
        hide,
        next,
        prev,
        skip,
        dismiss,
        checkAndShow,
        selectAvatar,
        navigateWithHelp
    };
})();

// Auto-check on page load (if this script is included)
if (typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', () => {
        // Small delay to let page load
        setTimeout(() => {
            OnboardingWizard.checkAndShow();
        }, 500);
    });
}
