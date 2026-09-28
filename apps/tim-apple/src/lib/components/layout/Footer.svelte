<footer>
    <div class="footer-content">
        <p>
            Copyright © {new Date().getFullYear()} Apple Inc. All rights reserved.
        </p>

        <ul class="footer-links">
            <li><a href="/terms">Terms of Use</a></li>
            <li><a href="/policy">Privacy Policy</a></li>
        </ul>
    </div>
</footer>

<style>
    footer {
        background: var(--footerBg);
        border-top: 1px solid var(--systemQuaternary);
        padding: 15px var(--bodyGutter);
        margin-top: auto;
        flex-shrink: 0;
    }

    .footer-content {
        max-width: 1440px;
        margin: 0 auto;
        font: var(--footnote);
        color: var(--systemSecondary);
    }

    .footer-content p {
        margin-bottom: 5px;
    }

    .footer-links {
        display: flex;
        flex-wrap: wrap;
    }

    li {
        display: inline-flex;
        line-height: 1;
        margin-top: 6px;
        vertical-align: middle;
    }

    li a {
        height: 100%;
        padding-inline-end: 10px;
        color: var(--systemPrimary);
    }

    li:not(:last-child)::after {
        border-inline-start: 1px solid var(--systemQuaternary);
        content: '';
        padding-inline-end: 10px;
    }

    @media (min-width: 768px) {
        .footer-content {
            display: flex;
            justify-content: space-between;
            align-items: center;
        }

        .footer-content p {
            margin-bottom: 0;
        }
    }
</style>
